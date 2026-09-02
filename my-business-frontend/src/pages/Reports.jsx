import { useEffect, useState } from "react";
import {
  BarChart3,
  RefreshCw,
  Package,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Calendar,
  Printer,
  Trophy,
  DollarSign,
  FileText,
} from "lucide-react";

import {
  getReports,
  getDashboard,
} from "../services/api";

function Reports() {
  const [report, setReport] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports(filters = {}) {
    try {
      setLoading(true);
      setError("");

      const [reportsResponse, dashboardResponse] =
        await Promise.all([
          getReports(filters),
          getDashboard(),
        ]);

      setReport(reportsResponse.data || null);
      setDashboard(dashboardResponse.data || null);
    } catch (err) {
      console.error("Reports error:", err);
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  function formatMoney(value) {
    return `MK ${Number(value || 0).toLocaleString("en-MW")}`;
  }

  function formatDate(date) {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-MW", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function handleFilter() {
    if (startDate && endDate && startDate > endDate) {
      setError("Start date cannot be later than end date.");
      return;
    }

    loadReports({
      start_date: startDate,
      end_date: endDate,
    });
  }

  function clearFilter() {
    setStartDate("");
    setEndDate("");
    loadReports();
  }

  function printReport() {
    window.print();
  }

  if (loading) {
    return (
      <div className="empty-page">
        <RefreshCw size={35} />
        <h2>Loading Reports...</h2>
        <p>Preparing your EM-PLUGS business report.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-page">
        <BarChart3 size={45} />

        <h2>Unable to Load Reports</h2>

        <p>{error}</p>

        <button
          className="view-all-btn"
          onClick={() =>
            loadReports({
              start_date: startDate,
              end_date: endDate,
            })
          }
        >
          <RefreshCw size={17} />
          Try Again
        </button>
      </div>
    );
  }

  const summary = report?.summary || {};
  const bestSelling = report?.best_selling_products || [];
  const salesHistory = report?.sales_history || [];

  const inventoryData = dashboard?.inventory || {};
  const salesData = dashboard?.sales || {};

  const totalProducts = Number(
    inventoryData.total_products || 0
  );

  const totalItems = Number(
    inventoryData.total_items || 0
  );

  const totalBuyingValue = Number(
    inventoryData.total_buying_value || 0
  );

  const totalSellingValue = Number(
    inventoryData.total_selling_value || 0
  );

  const expectedProfit = Number(
    inventoryData.expected_profit || 0
  );

  const totalTransactions = Number(
    summary.total_transactions || 0
  );

  const totalItemsSold = Number(
    summary.total_items_sold || 0
  );

  const totalSales = Number(
    summary.total_sales ?? salesData.total_sales ?? 0
  );

  const totalProfit = Number(
    summary.total_profit ?? salesData.total_profit ?? 0
  );

  const maxQuantitySold = Math.max(
    ...bestSelling.map((item) =>
      Number(item.quantity_sold || 0)
    ),
    1
  );

  return (
    <div className="reports-page">

      {/* HEADER */}
      <div className="reports-header">

        <div>
          <div className="reports-title-row">
            <div className="reports-title-icon">
              <FileText size={24} />
            </div>

            <div>
              <h1>Business Reports</h1>

              <p>
                Analyse your EM-PLUGS sales,
                profit and inventory performance.
              </p>
            </div>
          </div>
        </div>

        <div className="reports-actions">
          <button
            className="reports-secondary-btn"
            onClick={() =>
              loadReports({
                start_date: startDate,
                end_date: endDate,
              })
            }
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            className="reports-primary-btn"
            onClick={printReport}
          >
            <Printer size={17} />
            Print Report
          </button>
        </div>

      </div>


      {/* DATE FILTER */}
      <div className="reports-filter-card">

        <div className="reports-filter-title">
          <Calendar size={19} />

          <div>
            <strong>Report Period</strong>
            <span>
              Select a date range for your sales report.
            </span>
          </div>
        </div>

        <div className="reports-filter-controls">

          <div className="reports-date-field">
            <label>Start Date</label>

            <input
              type="date"
              value={startDate}
              onChange={(e) =>
                setStartDate(e.target.value)
              }
            />
          </div>

          <div className="reports-date-field">
            <label>End Date</label>

            <input
              type="date"
              value={endDate}
              onChange={(e) =>
                setEndDate(e.target.value)
              }
            />
          </div>

          <button
            className="reports-primary-btn"
            onClick={handleFilter}
          >
            <BarChart3 size={17} />
            Apply Filter
          </button>

          {(startDate || endDate) && (
            <button
              className="reports-secondary-btn"
              onClick={clearFilter}
            >
              Clear
            </button>
          )}

        </div>

      </div>


      {/* SUMMARY */}
      <div className="reports-summary-grid">

        <div className="report-card">

          <div className="report-card-icon reports-blue">
            <FileText size={22} />
          </div>

          <div>
            <span>Total Transactions</span>
            <strong>
              {totalTransactions.toLocaleString()}
            </strong>
          </div>

        </div>


        <div className="report-card">

          <div className="report-card-icon reports-purple">
            <ShoppingCart size={22} />
          </div>

          <div>
            <span>Items Sold</span>
            <strong>
              {totalItemsSold.toLocaleString()}
            </strong>
          </div>

        </div>


        <div className="report-card">

          <div className="report-card-icon reports-orange">
            <DollarSign size={22} />
          </div>

          <div>
            <span>Total Sales</span>
            <strong>
              {formatMoney(totalSales)}
            </strong>
          </div>

        </div>


        <div className="report-card">

          <div className="report-card-icon reports-green">
            <TrendingUp size={22} />
          </div>

          <div>
            <span>Total Profit</span>
            <strong className="profit-text">
              {formatMoney(totalProfit)}
            </strong>
          </div>

        </div>

      </div>


      {/* BEST SELLING PRODUCTS */}
      <div className="reports-section">

        <div className="reports-section-header">

          <div className="reports-heading-with-icon">
            <div className="reports-section-icon">
              <Trophy size={21} />
            </div>

            <div>
              <h2>Best-Selling Products</h2>

              <p>
                Products that have generated the most sales.
              </p>
            </div>
          </div>

        </div>

        {bestSelling.length === 0 ? (

          <div className="report-empty">
            <Trophy size={38} />
            <p>No product sales recorded for this period.</p>
          </div>

        ) : (

          <div className="table-wrapper">

            <table className="reports-table">

              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Quantity Sold</th>
                  <th>Sales Amount</th>
                  <th>Profit</th>
                </tr>
              </thead>

              <tbody>

                {bestSelling.map((item, index) => {

                  const quantity = Number(
                    item.quantity_sold || 0
                  );

                  const percentage =
                    (quantity / maxQuantitySold) * 100;

                  return (
                    <tr key={item.id || index}>

                      <td>
                        <span className="report-rank">
                          {index + 1}
                        </span>
                      </td>

                      <td>
                        <div className="best-product">
                          <div className="best-product-icon">
                            <Package size={17} />
                          </div>

                          <div>
                            <strong>
                              {item.name}
                            </strong>

                            <div className="best-product-bar">
                              <div
                                className="best-product-fill"
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong>{quantity}</strong>
                      </td>

                      <td>
                        {formatMoney(item.sales_amount)}
                      </td>

                      <td className="profit-value">
                        {formatMoney(item.profit)}
                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        )}

      </div>


      {/* FINANCIAL OVERVIEW */}
      <div className="reports-section">

        <div className="reports-section-header">

          <div className="reports-heading-with-icon">

            <div className="reports-section-icon">
              <Wallet size={21} />
            </div>

            <div>
              <h2>Financial Overview</h2>

              <p>
                Current inventory investment and expected returns.
              </p>
            </div>

          </div>

        </div>


        <div className="financial-grid">

          <div className="financial-item">
            <span>Inventory Buying Value</span>
            <strong>
              {formatMoney(totalBuyingValue)}
            </strong>
          </div>

          <div className="financial-item">
            <span>Inventory Selling Value</span>
            <strong>
              {formatMoney(totalSellingValue)}
            </strong>
          </div>

          <div className="financial-item">
            <span>Expected Inventory Profit</span>
            <strong className="profit-text">
              {formatMoney(expectedProfit)}
            </strong>
          </div>

          <div className="financial-item">
            <span>Actual Sales Revenue</span>
            <strong>
              {formatMoney(totalSales)}
            </strong>
          </div>

          <div className="financial-item">
            <span>Actual Sales Profit</span>
            <strong className="profit-text">
              {formatMoney(totalProfit)}
            </strong>
          </div>

          <div className="financial-item">
            <span>Products in Inventory</span>
            <strong>
              {totalProducts.toLocaleString()}
            </strong>
          </div>

        </div>

      </div>


      {/* SALES HISTORY */}
      <div className="reports-section">

        <div className="reports-section-header">

          <div className="reports-heading-with-icon">

            <div className="reports-section-icon">
              <ShoppingCart size={21} />
            </div>

            <div>
              <h2>Sales History</h2>

              <p>
                All sales transactions recorded in the system.
              </p>
            </div>

          </div>

          <span className="report-count">
            {salesHistory.length} transaction
            {salesHistory.length !== 1 ? "s" : ""}
          </span>

        </div>


        {salesHistory.length === 0 ? (

          <div className="report-empty">
            <ShoppingCart size={38} />
            <p>No sales transactions found.</p>
          </div>

        ) : (

          <div className="table-wrapper">

            <table className="reports-table">

              <thead>

                <tr>
                  <th>Sale ID</th>
                  <th>Date</th>
                  <th>Items Sold</th>
                  <th>Total Sales</th>
                  <th>Profit</th>
                </tr>

              </thead>

              <tbody>

                {salesHistory.map((sale) => (

                  <tr key={sale.id}>

                    <td>
                      <span className="sale-id">
                        #{sale.id}
                      </span>
                    </td>

                    <td>
                      {formatDate(sale.sale_date)}
                    </td>

                    <td>
                      {sale.items_sold || sale.item_count || 0}
                    </td>

                    <td>
                      {formatMoney(sale.total_amount)}
                    </td>

                    <td className="profit-value">
                      {formatMoney(sale.total_profit)}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* REPORT FOOTER */}
      <div className="reports-footer">

        <div>
          <strong>EM-PLUGS Business Report</strong>

          <span>
            Generated from your inventory and sales records.
          </span>
        </div>

        <span>
          {new Date().toLocaleDateString("en-MW", {
            dateStyle: "long",
          })}
        </span>

      </div>

    </div>
  );
}

export default Reports;
