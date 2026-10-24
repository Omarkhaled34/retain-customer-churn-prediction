import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import Predict from "../pages/Predict";
import PredictionResult from "../components/PredictionResult";
import Auth from "../pages/Auth";
import { api, errorMessage } from "../services/api";

vi.mock("../services/api", async (original) => ({
  ...(await original()),
  api: { get: vi.fn(), post: vi.fn() },
}));

// UI-only fixtures exercise rendering, not model inference. Live and E2E flows use the real artifact.
const metadata = {
  categories: {
    gender: ["Female", "Male"],
    subscription_type: ["Basic", "Premium", "Standard"],
    contract_length: ["Annual", "Monthly", "Quarterly"],
  },
};
const result = {
  id: 1,
  customer_id: "2",
  prediction: 1,
  churn_probability: 0.8,
  retention_probability: 0.2,
  risk_level: "High",
  model_version: "test-ui-fixture",
};
const wrap = (component) =>
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {component}
    </MemoryRouter>,
  );

async function fillCustomer(user) {
  for (const [label, value] of [
    ["Customer ID", "2"],
    ["Age", "30"],
    ["Tenure", "39"],
    ["Usage frequency", "14"],
    ["Support calls", "5"],
    ["Last interaction", "17"],
    ["Payment delay", "18"],
    ["Total spend", "932"],
  ]) {
    await user.type(screen.getByLabelText(new RegExp(`^${label}`)), value);
  }
  await user.selectOptions(screen.getByLabelText(/^Gender/), "Female");
  await user.selectOptions(
    screen.getByLabelText(/^Subscription type/),
    "Standard",
  );
  await user.selectOptions(screen.getByLabelText(/^Contract length/), "Annual");
}

describe("prediction UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: metadata });
  });
  it("requires all customer inputs before sending a prediction", async () => {
    const user = userEvent.setup();
    wrap(<Predict />);
    const button = await screen.findByRole("button", { name: /Predict Churn/ });
    await user.click(button);
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Age/)).toBeInvalid();
  });
  it("submits typed data and renders the response probability", async () => {
    api.post.mockResolvedValue({ data: result });
    const user = userEvent.setup();
    wrap(<Predict />);
    await screen.findByRole("button", { name: /Predict Churn/ });
    await fillCustomer(user);
    await user.click(screen.getByRole("button", { name: /Predict Churn/ }));
    expect(await screen.findByText("80.0%")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith(
      "/predict/",
      expect.objectContaining({ customer_id: "2", age: 30, total_spend: 932 }),
    );
    expect(
      screen.getByText("Saved to your prediction history"),
    ).toBeInTheDocument();
  });
  it("shows API failures without fabricating results", async () => {
    api.post.mockRejectedValue({
      response: { data: { detail: "Model unavailable." }, status: 503 },
    });
    const user = userEvent.setup();
    wrap(<Predict />);
    await screen.findByRole("button", { name: /Predict Churn/ });
    await fillCustomer(user);
    await user.click(screen.getByRole("button", { name: /Predict Churn/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Model unavailable.",
    );
    expect(
      screen.queryByText("Saved to your prediction history"),
    ).not.toBeInTheDocument();
  });
  it("renders retention probability, risk, and the uncertainty explanation", () => {
    wrap(<PredictionResult result={result} />);
    expect(screen.getByText("20.0%")).toBeInTheDocument();
    expect(screen.getByText("High risk")).toBeInTheDocument();
    expect(
      screen.getByText(/not guaranteed future behavior/),
    ).toBeInTheDocument();
  });
  it("formats server validation details", () => {
    expect(
      errorMessage({
        response: {
          data: { detail: "Check inputs", errors: { age: ["Invalid age"] } },
        },
      }),
    ).toContain("Invalid age");
  });
});

function Identity() {
  const { user, loading } = useAuth();
  return <span>{loading ? "Loading" : user?.username || "Anonymous"}</span>;
}

describe("authentication", () => {
  beforeEach(() => vi.clearAllMocks());
  it("restores a session from the server", async () => {
    api.get.mockResolvedValue({ data: { username: "analyst" } });
    wrap(
      <AuthProvider>
        <Identity />
      </AuthProvider>,
    );
    expect(await screen.findByText("analyst")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/auth/profile/");
  });
  it("bootstraps CSRF before login and navigates to the authenticated workspace", async () => {
    api.get.mockImplementation((url) =>
      url === "/auth/profile/"
        ? Promise.reject({ response: { status: 403 } })
        : Promise.resolve({ data: {} }),
    );
    api.post.mockResolvedValue({ data: { username: "analyst" } });
    const user = userEvent.setup();
    wrap(
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/app" element={<Identity />} />
        </Routes>
      </AuthProvider>,
    );
    await screen.findByLabelText("Username");
    await user.type(screen.getByLabelText("Username"), "analyst");
    await user.type(screen.getByLabelText("Password"), "S3cure-Pass!123");
    await user.click(screen.getByRole("button", { name: /^Sign in/ }));
    expect(await screen.findByText("analyst")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/auth/csrf/");
    expect(api.post).toHaveBeenCalledWith("/auth/login/", {
      username: "analyst",
      password: "S3cure-Pass!123",
    });
  });
  it("displays a rejected login", async () => {
    api.get.mockImplementation((url) =>
      url === "/auth/profile/"
        ? Promise.reject({ response: { status: 403 } })
        : Promise.resolve({ data: {} }),
    );
    api.post.mockRejectedValue({
      response: { data: { detail: "Invalid username or password." } },
    });
    const user = userEvent.setup();
    wrap(
      <AuthProvider>
        <Auth />
      </AuthProvider>,
    );
    await screen.findByLabelText("Username");
    await user.type(screen.getByLabelText("Username"), "analyst");
    await user.type(screen.getByLabelText("Password"), "bad");
    await user.click(screen.getByRole("button", { name: /^Sign in/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid username or password.",
    );
  });
});
