function ProductTable({ products }) {
  return (
    <div className="table-container">

      <table>

        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Buying Price</th>
            <th>Selling Price</th>
            <th>Profit / Item</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          {products.map((product) => {

            const profit =
              product.sellingPrice -
              product.buyingPrice;

            return (
              <tr key={product.id}>

                <td>
                  <strong>
                    {product.name}
                  </strong>
                </td>

                <td>
                  {product.category}
                </td>

                <td>
                  {product.stock}
                </td>

                <td>
                  MK {product.buyingPrice.toLocaleString()}
                </td>

                <td>
                  MK {product.sellingPrice.toLocaleString()}
                </td>

                <td className="profit">
                  MK {profit.toLocaleString()}
                </td>

                <td>

                  <span
                    className={
                      product.stock <= 5
                        ? "status low"
                        : "status good"
                    }
                  >
                    {product.stock <= 5
                      ? "Low Stock"
                      : "In Stock"}
                  </span>

                </td>

              </tr>
            );

          })}

        </tbody>

      </table>

    </div>
  );
}

export default ProductTable;