import { useState } from "react";
import { PackagePlus, Save, X } from "lucide-react";
import { addProduct } from "../services/api";

function AddProduct({ onProductAdded }) {
  const [form, setForm] = useState({
    name: "",
    category_id: "",
    description: "",
    quantity: "",
    buying_price: "",
    selling_price: "",
    purchase_date: new Date().toISOString().split("T")[0],
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const product = {
        name: form.name,
        category_id: form.category_id
          ? Number(form.category_id)
          : null,
        description: form.description,
        quantity: Number(form.quantity),
        buying_price: Number(form.buying_price),
        selling_price: Number(form.selling_price),
        purchase_date: form.purchase_date,
      };

      await addProduct(product);

      setMessage("Product added successfully!");

      setForm({
        name: "",
        category_id: "",
        description: "",
        quantity: "",
        buying_price: "",
        selling_price: "",
        purchase_date: new Date().toISOString().split("T")[0],
      });

      if (onProductAdded) {
        onProductAdded();
      }

   } catch (err) {
  console.error("ADD PRODUCT ERROR:", err);
  setError(err.message || "Failed to add product.");
}
    
    finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setForm({
      name: "",
      category_id: "",
      description: "",
      quantity: "",
      buying_price: "",
      selling_price: "",
      purchase_date: new Date().toISOString().split("T")[0],
    });

    setMessage("");
    setError("");
  }

  return (
    <div className="add-product-page">

      <div className="page-heading">
        <div>
          <h1>Add Product</h1>
          <p>
            Add a new product to your EM-PLUGS inventory.
          </p>
        </div>

        <div className="heading-icon">
          <PackagePlus size={30} />
        </div>
      </div>

      <div className="product-form-card">

        <div className="form-card-header">
          <div>
            <h2>Product Registration</h2>
            <p>
              Enter the product details below.
            </p>
          </div>
        </div>

        {message && (
          <div className="success-message">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            ✕ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="form-grid">

            <div className="form-group">
              <label>Product Name *</label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Oraimo Headset"
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>

              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
              >
                <option value="">Select category</option>
                <option value="1">Electronics</option>
                <option value="2">Home Appliances</option>
                <option value="3">Beauty & Hair</option>
                <option value="4">Food</option>
                <option value="5">Kitchen</option>
                <option value="6">Accessories</option>
                <option value="7">Other</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Description</label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter product description..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Quantity *</label>

              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder="0"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Buying Price (MWK) *</label>

              <input
                type="number"
                name="buying_price"
                value={form.buying_price}
                onChange={handleChange}
                placeholder="e.g. 5000"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Selling Price (MWK) *</label>

              <input
                type="number"
                name="selling_price"
                value={form.selling_price}
                onChange={handleChange}
                placeholder="e.g. 7000"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Purchase Date *</label>

              <input
                type="date"
                name="purchase_date"
                value={form.purchase_date}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          <div className="form-actions">

            <button
              type="button"
              className="cancel-btn"
              onClick={handleReset}
            >
              <X size={18} />
              Clear
            </button>

            <button
              type="submit"
              className="save-btn"
              disabled={loading}
            >
              <Save size={18} />

              {loading ? "Saving..." : "Save Product"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default AddProduct;