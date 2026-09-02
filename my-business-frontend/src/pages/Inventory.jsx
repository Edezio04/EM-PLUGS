import { useEffect, useState } from "react";
import {
  Package,
  Minus,
  RefreshCw,
  Search
} from "lucide-react";

import {
  getProducts,
  deleteProduct
} from "../services/api";

function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await getProducts();

      setProducts(response.data || []);

    } catch (err) {
      console.error("Inventory error:", err);

      setError(
        err.message || "Failed to load inventory"
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // =====================================================
  // DECREASE QUANTITY BY 1
  // =====================================================

  async function handleDelete(id, name, quantity) {

    const currentQuantity = Number(quantity || 0);

    if (currentQuantity <= 0) {
      return;
    }

    const message =
      currentQuantity === 1
        ? `Remove the last "${name}" from inventory?`
        : `Remove 1 "${name}" from inventory?\n\nCurrent quantity: ${currentQuantity}\nNew quantity: ${currentQuantity - 1}`;

    const confirmed = window.confirm(message);

    if (!confirmed) {
      return;
    }

    try {

      setDeleting(id);
      setError("");

      const response = await deleteProduct(id);

      console.log("Quantity decreased:", response);

      // =================================================
      // IF QUANTITY BECOMES ZERO, REMOVE PRODUCT
      // OTHERWISE UPDATE THE QUANTITY
      // =================================================

      const newQuantity =
        Number(response.quantity ?? currentQuantity - 1);

      if (newQuantity <= 0) {

        setProducts((currentProducts) =>
          currentProducts.filter(
            (product) => product.id !== id
          )
        );

      } else {

        setProducts((currentProducts) =>
          currentProducts.map((product) => {

            if (product.id !== id) {
              return product;
            }

            const oldQuantity =
              Number(product.quantity || 0);

            const buyingValue =
              oldQuantity > 0
                ? (
                    Number(product.total_buying_value || 0) /
                    oldQuantity
                  ) * newQuantity
                : 0;

            const sellingValue =
              oldQuantity > 0
                ? (
                    Number(product.total_selling_value || 0) /
                    oldQuantity
                  ) * newQuantity
                : 0;

            const profit =
              sellingValue - buyingValue;

            return {
              ...product,
              quantity: newQuantity,
              total_buying_value: buyingValue,
              total_selling_value: sellingValue,
              expected_profit: profit
            };

          })
        );
      }

    } catch (err) {

      console.error("Decrease quantity error:", err);

      setError(
        err.message ||
        "Failed to decrease product quantity"
      );

    } finally {

      setDeleting(null);

    }
  }

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredProducts = products.filter((product) => {

    const searchText = search.toLowerCase();

    return (
      product.name
        ?.toLowerCase()
        .includes(searchText) ||

      product.category
        ?.toLowerCase()
        .includes(searchText) ||

      product.description
        ?.toLowerCase()
        .includes(searchText)
    );

  });

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <div className="empty-page">

        <RefreshCw size={32} />

        <h2>Loading Inventory...</h2>

        <p>
          Getting your products from the database.
        </p>

      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="inventory-page">

      {/* PAGE HEADER */}

      <div className="page-heading">

        <div>

          <h1>Inventory</h1>

          <p>
            Manage all products currently in your
            EM-PLUGS inventory.
          </p>

        </div>

        <button
          className="view-all-btn"
          onClick={loadProducts}
          type="button"
        >

          <RefreshCw size={17} />

          Refresh

        </button>

      </div>


      {/* ERROR */}

      {error && (

        <div className="error-message">
          ✕ {error}
        </div>

      )}


      {/* SEARCH */}

      <div className="inventory-toolbar">

        <div className="inventory-search">

          <Search size={19} />

          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        <div className="inventory-count">

          {filteredProducts.length} product
          {filteredProducts.length !== 1
            ? "s"
            : ""}

        </div>

      </div>


      {/* NO PRODUCTS */}

      {products.length === 0 ? (

        <div className="empty-page">

          <Package size={50} />

          <h2>No Products Yet</h2>

          <p>
            Your inventory is currently empty.
          </p>

          <p>
            Add a product from the{" "}
            <strong>Add Product</strong> page.
          </p>

        </div>

      ) : filteredProducts.length === 0 ? (

        <div className="empty-page">

          <Search size={45} />

          <h2>No Products Found</h2>

          <p>
            No products match "{search}".
          </p>

        </div>

      ) : (

        <div className="inventory-table-card">

          <div className="table-wrapper">

            <table className="inventory-table">

              <thead>

                <tr>

                  <th>Product</th>

                  <th>Category</th>

                  <th>Quantity</th>

                  <th>Buying Value</th>

                  <th>Selling Value</th>

                  <th>Expected Profit</th>

                  <th>Action</th>

                </tr>

              </thead>

              <tbody>

                {filteredProducts.map((product) => {

                  const quantity =
                    Number(product.quantity || 0);

                  const buyingValue =
                    Number(
                      product.total_buying_value || 0
                    );

                  const sellingValue =
                    Number(
                      product.total_selling_value || 0
                    );

                  const profit =
                    Number(
                      product.expected_profit || 0
                    );

                  return (

                    <tr key={product.id}>

                      {/* PRODUCT */}

                      <td>

                        <div className="product-name-cell">

                          <div className="product-icon">
                            <Package size={18} />
                          </div>

                          <div>

                            <strong>
                              {product.name}
                            </strong>

                            {product.description && (

                              <small>
                                {product.description}
                              </small>

                            )}

                          </div>

                        </div>

                      </td>


                      {/* CATEGORY */}

                      <td>

                        <span className="category-badge">

                          {product.category ||
                            "Uncategorized"}

                        </span>

                      </td>


                      {/* QUANTITY */}

                      <td>

                        <strong>
                          {quantity}
                        </strong>

                      </td>


                      {/* BUYING VALUE */}

                      <td>

                        MK{" "}
                        {buyingValue.toLocaleString()}

                      </td>


                      {/* SELLING VALUE */}

                      <td>

                        MK{" "}
                        {sellingValue.toLocaleString()}

                      </td>


                      {/* PROFIT */}

                      <td className="profit-value">

                        MK{" "}
                        {profit.toLocaleString()}

                      </td>


                      {/* ACTION */}

                      <td>

                        <button
                          className="delete-btn"
                          type="button"
                          onClick={() =>
                            handleDelete(
                              product.id,
                              product.name,
                              quantity
                            )
                          }
                          disabled={
                            deleting === product.id ||
                            quantity <= 0
                          }
                          title="Decrease quantity by 1"
                        >

                          <Minus size={17} />

                          {deleting === product.id
                            ? "Removing..."
                            : "Remove 1"}

                        </button>

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        </div>

      )}

    </div>
  );
}

export default Inventory;
