import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const csrf = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("csrftoken="))
    ?.split("=")[1];
  if (csrf) config.headers["X-CSRFToken"] = decodeURIComponent(csrf);
  return config;
});

export function errorMessage(error) {
  const data = error.response?.data;
  if (typeof data?.detail === "string" && !data.errors) return data.detail;
  if (data?.errors)
    return `${data.detail || "Please check your data."} ${JSON.stringify(data.errors)}`;
  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(
        ([key, values]) =>
          `${key.replaceAll("_", " ")}: ${typeof values === "object" ? JSON.stringify(values) : values}`,
      )
      .join(" · ");
  }
  return error.code === "ECONNABORTED"
    ? "The request timed out. Check history before retrying a prediction."
    : "Unable to reach the server. Please try again.";
}

export async function downloadBatch(batchId) {
  const { data } = await api.get("/predictions/export/", {
    params: { batch_id: batchId },
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `churn-results-${batchId}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
