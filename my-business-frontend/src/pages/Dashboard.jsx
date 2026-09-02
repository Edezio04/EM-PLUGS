import { useEffect, useState } from "react";
import {
  Package,
  Wallet,
  TrendingUp,
  ShoppingCart,
  RefreshCw
} from "lucide-react";

import StatCard from "../components/StatCard";
import ProductTable from "../components/ProductTable";
import { getDashboard, getProducts } from "../services/api";

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [dashboardResponse, productsResponse] = await Promise.all([
        getDashboard(),
        getProducts()
      ]);

      setDashboard(dashboardResponse.data);

      setProducts(productsResponse.data || []);

    } catch (err) {
      console.error("Dashboard error:", err);
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="empty-page">
        <RefreshCw size={32} />
        <h2>Loading dashboard...</h2>
        <p>Getting your business data from the database.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-page">
        <h2>Unable to load dashboard</h2>

        <p>{error}</p>

        <button
          className="save-btn"
          onClick={loadDashboard}
        >
          Try Again
        </button>
      </div>
    );
  }

  const inventory = dashboard?.inventory || {};

  const totalProducts = Number(
    inventory.total_products || 0
  );

  const totalItems = Number(
    inventory.total_items || 0
  );

  const totalInvestment = Number(
    inventory.total_buying_value || 0
  );

  const expectedRevenue = Number(
    inventory.total_selling_value || 0
  );

  const expectedProfit = Number(
    inventory.expected_profit || 0
  );

  const formattedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category || "Uncategorized",
    stock: Number(product.quantity || 0),

    buyingPrice:
      Number(product.total_buying_value || 0) /
      Math.max(Number(product.quantity || 1), 1),

    sellingPrice:
      Number(product.total_selling_value || 0) /
      Math.max(Number(product.quantity || 1), 1)
  }));

  return (
    <div>

      <div className="page-heading">

        <div>
          <h1>Dashboard</h1>

          <p>
            Welcome to your EM-PLUGS business dashboard.
          </p>
        </div>

        <div className="date-display">
          {new Date().toLocaleDateString(
            "en-GB",
            {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric"
            }
          )}
        </div>

      </div>


      <div className="stats-grid">

        <StatCard
          title="Total Products"
          value={totalProducts}
          description={`${totalItems} items currently in stock`}
          icon={Package}
          type="blue"
        />

        <StatCard
          title="Stock Investment"
          value={`MK ${totalInvestment.toLocaleString()}`}
          description="Money invested in stock"
          icon={Wallet}
          type="purple"
        />

        <StatCard
          title="Expected Revenue"
          value={`MK ${expectedRevenue.toLocaleString()}`}
          description="If all stock is sold"
          icon={ShoppingCart}
          type="orange"
        />

        <StatCard
          title="Expected Profit"
          value={`MK ${expectedProfit.toLocaleString()}`}
          description="Potential business profit"
          icon={TrendingUp}
          type="green"
        />

      </div>


      <div className="section-header">

        <div>
          <h2>Current Inventory</h2>

          <p>
            Overview of products currently in your database.
          </p>
        </div>

        <button
          className="view-all-btn"
          onClick={loadDashboard}
        >
          Refresh
        </button>

      </div>


      {formattedProducts.length === 0 ? (

        <div className="empty-page">

          <Package size={45} />

          <h2>No Products Yet</h2>

          <p>
            You have not added any products yet.
          </p>

          <p>
            Go to <strong>Add Product</strong> to register
            your first product.
          </p>

        </div>

      ) : (

        <ProductTable products={formattedProducts} />

      )}

    </div>
  );
}

export default Dashboard;