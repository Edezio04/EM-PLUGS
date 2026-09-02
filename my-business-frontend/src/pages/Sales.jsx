import { useEffect, useState } from "react";
import {
  ShoppingCart,
  RefreshCw,
  Trash2,
  Plus,
  Minus
} from "lucide-react";

import {
  getProducts,
  getSales,
  createSale
} from "../services/api";

function Sales() {

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  const [cart, setCart] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selling, setSelling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);

  // =====================================================
  // LOAD PRODUCTS AND SALES
  // =====================================================

  async function loadData() {

    try {

      setLoading(true);
      setError("");

      const [productsResponse, salesResponse] =
        await Promise.all([
          getProducts(),
          getSales()
        ]);

      setProducts(productsResponse.data || []);
      setSales(salesResponse.data || []);

    } catch (err) {

      console.error("Sales loading error:", err);

      setError(
        err.message || "Failed to load sales data"
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {
    loadData();
  }, []);


  // =====================================================
  // ADD PRODUCT TO CART
  // =====================================================

  function addToCart() {

    setError("");
    setSuccess("");

    if (!selectedProduct) {

      setError("Please select a product.");

      return;
    }

    const product = products.find(
      (item) =>
        Number(item.id) === Number(selectedProduct)
    );

    if (!product) {

      setError("Product not found.");

      return;
    }

    const availableStock =
      Number(product.quantity || 0);

    if (availableStock <= 0) {

      setError(
        `${product.name} is out of stock.`
      );

      return;
    }

    const saleQuantity =
      Number(quantity);

    if (
      !Number.isInteger(saleQuantity) ||
      saleQuantity <= 0
    ) {

      setError(
        "Quantity must be greater than 0."
      );

      return;
    }

    const existingItem =
      cart.find(
        (item) =>
          Number(item.product_id) ===
          Number(product.id)
      );

    const currentCartQuantity =
      existingItem
        ? existingItem.quantity
        : 0;

    if (
      currentCartQuantity +
        saleQuantity >
      availableStock
    ) {

      setError(
        `Only ${availableStock} ${product.name} available in stock.`
      );

      return;
    }


    if (existingItem) {

      setCart(
        cart.map((item) =>
          Number(item.product_id) ===
          Number(product.id)
            ? {
                ...item,
                quantity:
                  item.quantity +
                  saleQuantity
              }
            : item
        )
      );

    } else {

      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          quantity: saleQuantity,
          stock: availableStock,
          selling_price:
            Number(
              product.total_selling_value || 0
            ) /
            availableStock
        }
      ]);

    }


    setSelectedProduct("");
    setQuantity(1);
  }


  // =====================================================
  // REMOVE CART ITEM
  // =====================================================

  function removeFromCart(productId) {

    setCart(
      cart.filter(
        (item) =>
          Number(item.product_id) !==
          Number(productId)
      )
    );
  }


  // =====================================================
  // CHANGE CART QUANTITY
  // =====================================================

  function changeQuantity(
    productId,
    change
  ) {

    setCart(
      cart.map((item) => {

        if (
          Number(item.product_id) !==
          Number(productId)
        ) {
          return item;
        }

        const newQuantity =
          item.quantity + change;

        if (newQuantity <= 0) {
          return null;
        }

        if (
          newQuantity >
          item.stock
        ) {

          setError(
            `Only ${item.stock} ${item.name} available.`
          );

          return item;
        }

        return {
          ...item,
          quantity: newQuantity
        };

      }).filter(Boolean)
    );
  }


  // =====================================================
  // TOTALS
  // =====================================================

  const cartTotal =
    cart.reduce(
      (total, item) =>
        total +
        item.quantity *
          item.selling_price,
      0
    );


  const totalItems =
    cart.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );


  // =====================================================
  // COMPLETE SALE
  // =====================================================

  async function completeSale() {

    setError("");
    setSuccess("");

    if (cart.length === 0) {

      setError(
        "Please add at least one product to the sale."
      );

      return;
    }

    try {

      setSelling(true);

      const saleData = {

        items: cart.map((item) => ({
          product_id:
            Number(item.product_id),

          quantity:
            Number(item.quantity),

          selling_price:
            Number(item.selling_price)
        }))

      };


      const response =
        await createSale(saleData);


      if (!response.success) {

        throw new Error(
          response.message ||
          "Failed to complete sale"
        );
      }


      setSuccess(
        response.message ||
        "Sale completed successfully!"
      );

      setCart([]);

      await loadData();

    } catch (err) {

      console.error(
        "Complete sale error:",
        err
      );

      setError(
        err.message ||
        "Failed to complete sale"
      );

    } finally {

      setSelling(false);

    }
  }


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <div className="empty-page">

        <RefreshCw size={32} />

        <h2>
          Loading Sales...
        </h2>

        <p>
          Getting your sales information.
        </p>

      </div>
    );
  }


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="sales-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-heading">

        <div>

          <h1>
            Sales
          </h1>

          <p>
            Record sales and track your business revenue.
          </p>

        </div>

        <button
          className="view-all-btn"
          onClick={loadData}
        >
          <RefreshCw size={17} />
          Refresh
        </button>

      </div>


      {/* =================================================
          MESSAGES
      ================================================= */}

      {error && (

        <div className="error-message">
          ✕ {error}
        </div>

      )}


      {success && (

        <div className="success-message">
          ✓ {success}
        </div>

      )}


      {/* =================================================
          CREATE SALE
      ================================================= */}

      <div className="sales-card">

        <div className="sales-card-header">

          <div>

            <h2>
              New Sale
            </h2>

            <p>
              Select products and quantities to sell.
            </p>

          </div>

          <ShoppingCart size={28} />

        </div>


        {/* PRODUCT SELECTOR */}

        <div className="sale-form">

          <div className="form-group">

            <label>
              Product
            </label>

            <select
              value={selectedProduct}
              onChange={(e) =>
                setSelectedProduct(
                  e.target.value
                )
              }
            >

              <option value="">
                Select a product
              </option>

              {products.map((product) => (

                <option
                  key={product.id}
                  value={product.id}
                  disabled={
                    Number(product.quantity || 0) <= 0
                  }
                >

                  {product.name}
                  {" "}
                  —
                  {" "}
                  Stock:
                  {" "}
                  {Number(
                    product.quantity || 0
                  )}

                </option>

              ))}

            </select>

          </div>


          <div className="form-group">

            <label>
              Quantity
            </label>

            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Number(e.target.value)
                )
              }
            />

          </div>


          <button
            className="add-sale-btn"
            onClick={addToCart}
          >
            <Plus size={18} />
            Add to Sale
          </button>

        </div>


        {/* =================================================
            CART
        ================================================= */}

        {cart.length > 0 && (

          <div className="sale-cart">

            <div className="sale-cart-header">

              <h3>
                Current Sale
              </h3>

              <span>
                {totalItems} item
                {totalItems !== 1
                  ? "s"
                  : ""}
              </span>

            </div>


            <div className="sale-cart-list">

              {cart.map((item) => (

                <div
                  className="sale-cart-item"
                  key={item.product_id}
                >

                  <div className="sale-product-info">

                    <strong>
                      {item.name}
                    </strong>

                    <small>
                      MK{" "}
                      {item.selling_price.toLocaleString()}
                      {" "}
                      per item
                    </small>

                  </div>


                  <div className="quantity-controls">

                    <button
                      onClick={() =>
                        changeQuantity(
                          item.product_id,
                          -1
                        )
                      }
                    >
                      <Minus size={15} />
                    </button>

                    <strong>
                      {item.quantity}
                    </strong>

                    <button
                      onClick={() =>
                        changeQuantity(
                          item.product_id,
                          1
                        )
                      }
                    >
                      <Plus size={15} />
                    </button>

                  </div>


                  <strong className="sale-item-total">

                    MK{" "}
                    {(
                      item.quantity *
                      item.selling_price
                    ).toLocaleString()}

                  </strong>


                  <button
                    className="remove-sale-btn"
                    onClick={() =>
                      removeFromCart(
                        item.product_id
                      )
                    }
                    title="Remove"
                  >
                    <Trash2 size={17} />
                  </button>

                </div>

              ))}

            </div>


            {/* TOTAL */}

            <div className="sale-total">

              <div>

                <span>
                  Total Sale
                </span>

                <strong>
                  MK{" "}
                  {cartTotal.toLocaleString()}
                </strong>

              </div>


              <button
                className="complete-sale-btn"
                onClick={completeSale}
                disabled={selling}
              >

                <ShoppingCart size={18} />

                {selling
                  ? "Processing..."
                  : "Complete Sale"}

              </button>

            </div>

          </div>

        )}

      </div>


      {/* =================================================
          SALES HISTORY
      ================================================= */}

      <div className="section-header">

        <div>

          <h2>
            Sales History
          </h2>

          <p>
            Previous sales recorded in your business.
          </p>

        </div>

      </div>


      {sales.length === 0 ? (

        <div className="empty-page">

          <ShoppingCart size={50} />

          <h2>
            No Sales Yet
          </h2>

          <p>
            Your completed sales will appear here.
          </p>

        </div>

      ) : (

        <div className="sales-table-card">

          <div className="table-wrapper">

            <table className="sales-table">

              <thead>

                <tr>

                  <th>
                    Sale #
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Total Amount
                  </th>

                  <th>
                    Profit
                  </th>

                </tr>

              </thead>


              <tbody>

                {sales.map((sale) => (

                  <tr key={sale.id}>

                    <td>
                      #{sale.id}
                    </td>

                    <td>
                      {sale.sale_date
                        ? new Date(
                            sale.sale_date
                          ).toLocaleString(
                            "en-GB"
                          )
                        : "-"}
                    </td>

                    <td>
                      <strong>
                        MK{" "}
                        {Number(
                          sale.total_amount ||
                          0
                        ).toLocaleString()}
                      </strong>
                    </td>

                    <td className="profit-value">
                      MK{" "}
                      {Number(
                        sale.total_profit ||
                        0
                      ).toLocaleString()}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

    </div>

  );
}

export default Sales;
