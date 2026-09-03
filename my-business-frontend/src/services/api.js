const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

async function request(url, options = {}) {

  const response = await fetch(`${API_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Request failed"
    );
  }

  return data;
}


// =====================================================
// PRODUCTS
// =====================================================

export async function getProducts() {
  return request("/products");
}


export async function addProduct(product) {

  return request("/products", {
    method: "POST",
    body: JSON.stringify(product),
  });

}


export async function deleteProduct(id) {

  return request(`/products/${id}`, {
    method: "DELETE",
  });

}


// =====================================================
// CATEGORIES
// =====================================================

export async function getCategories() {
  return request("/categories");
}


// =====================================================
// INVENTORY
// =====================================================

export async function getInventory() {
  return request("/inventory");
}


// =====================================================
// DASHBOARD
// =====================================================

export async function getDashboard() {
  return request("/dashboard");
}

export async function getSales() {
  return request("/sales");
}

export async function createSale(sale) {
  return request("/sales", {
    method: "POST",
    body: JSON.stringify(sale),
  });
}

export async function deleteSale(id) {
  return request(`/sales/${id}`, {
    method: "DELETE",
  });
}


export async function getReports(params = {}) {
  const query = new URLSearchParams();

  if (params.start_date) {
    query.set("start_date", params.start_date);
  }

  if (params.end_date) {
    query.set("end_date", params.end_date);
  }

  const queryString = query.toString();

  return request(
    `/reports${queryString ? `?${queryString}` : ""}`
  );
}
