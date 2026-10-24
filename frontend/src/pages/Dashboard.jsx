import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Users,
  UserRoundMinus,
  UserRoundCheck,
  Activity,
  Plus,
  Upload,
  CalendarDays,
  Info,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../context/AuthContext";
import {
  PageHeader,
  Skeletons,
  ErrorNotice,
  EmptyState,
  RiskBadge,
  percent,
  number,
  date,
} from "../components/UI";

const COLORS = { High: "#ef866f", Medium: "#efbc5e", Low: "#6e75e7" };
const tooltipStyle = {
  border: "1px solid #e8eaf1",
  borderRadius: 12,
  fontSize: 12,
};

function ChartCard({ title, subtitle, children, className = "", action }) {
  return (
    <section className={`card chart-card ${className}`}>
      <div className="card-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [days, setDays] = useState("");
  const { data, loading, error, refresh } = useResource(
    `/analytics/overview/${days ? `?days=${days}` : ""}`,
  );
  const recent = useResource("/predictions/");
  const total = data?.total_predictions || 0;
  const risk = ["Low", "Medium", "High"].map((name) => ({
    name,
    count:
      data?.risk_distribution.find((r) => r.risk_level === name)?.count || 0,
  }));
  const stats = data
    ? [
        [
          "Total predictions",
          number(total),
          Users,
          "purple",
          `${number(data.total_customers)} distinct customers analyzed`,
        ],
        [
          "Predicted to churn",
          number(data.predicted_churn),
          UserRoundMinus,
          "coral",
          `${total ? ((data.predicted_churn / total) * 100).toFixed(1) : "0"}% of all predictions`,
        ],
        [
          "Predicted to stay",
          number(data.predicted_retained),
          UserRoundCheck,
          "green",
          `${total ? ((data.predicted_retained / total) * 100).toFixed(1) : "0"}% of all predictions`,
        ],
        [
          "Average churn probability",
          percent(data.average_probability),
          Activity,
          "blue",
          total
            ? "Mean estimated risk across predictions"
            : "Available after your first prediction",
        ],
      ]
    : [];
  return (
    <>
      <PageHeader
        title={`A clearer view, ${user.first_name?.split(" ")[0] || user.username}.`}
        description="Understand your customers. Find the signals that matter."
      >
        <Link className="button button-primary" to="/app/predict">
          <Plus size={17} />
          New prediction
        </Link>
      </PageHeader>
      <div className="overview-banner">
        <span className="overview-orb">
          <Activity size={23} />
        </span>
        <div>
          <span className="eyebrow">FROM INSIGHT TO ACTION</span>
          <h3>Every customer relationship has a story.</h3>
          <p>Spot the signs early and make your next conversation count.</p>
        </div>
        <Link to="/app/batch">
          Analyze a customer list <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="section-toolbar">
        <h2>
          Performance overview{" "}
          <span className="live-label">
            <span />
            Your data
          </span>
        </h2>
        <label className="date-filter">
          <CalendarDays size={15} />
          <span className="sr-only">Analytics period</span>
          <select
            value={days}
            onChange={(event) => setDays(event.target.value)}
          >
            <option value="">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
      </div>
      <ErrorNotice message={error} onRetry={refresh} />
      {loading ? (
        <Skeletons />
      ) : (
        data && (
          <>
            <div className="stats-grid">
              {stats.map(([label, value, Icon, color, caption]) => (
                <div className="card stat-card" key={label}>
                  <div className="stat-top">
                    <span>{label}</span>
                    <span className={`stat-icon ${color}`}>
                      <Icon size={18} />
                    </span>
                  </div>
                  <strong>{value}</strong>
                  <p>
                    <span className={`tiny-dot ${color}`} />
                    {caption}
                  </p>
                </div>
              ))}
            </div>
            {total === 0 ? (
              <div className="card first-prediction">
                <EmptyState
                  title="Meet your retention command center"
                  description="Your charts will come to life with your first prediction. Start with one customer, or upload a CSV to see the bigger picture."
                />
                <div className="empty-chart-decoration" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                  <div />
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              </div>
            ) : (
              <>
                <div className="dashboard-charts">
                  <ChartCard
                    title="Prediction activity"
                    subtitle="Your customer assessments over time"
                    action={
                      <span className="chart-legend">
                        <i /> Churn <i className="legend-light" /> Retained
                      </span>
                    }
                  >
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={data.trends}
                          margin={{ top: 15, right: 8, left: -25, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="churnFill"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#7565ed"
                                stopOpacity={0.2}
                              />
                              <stop
                                offset="100%"
                                stopColor="#7565ed"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="4 5"
                            vertical={false}
                            stroke="#edf0f5"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "#9297a7" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) =>
                              new Date(`${value}T00:00:00Z`).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  timeZone: "UTC",
                                },
                              )
                            }
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#9297a7" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Area
                            isAnimationActive={false}
                            type="monotone"
                            name="Churn"
                            dataKey="churn"
                            stroke="#7565ed"
                            fill="url(#churnFill)"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                          <Area
                            isAnimationActive={false}
                            type="monotone"
                            name="Retained"
                            dataKey="retained"
                            stroke="#60baa6"
                            fill="transparent"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                  <ChartCard
                    title="Churn & retention"
                    subtitle="Prediction outcomes at a glance"
                  >
                    <div className="donut-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            isAnimationActive={false}
                            data={[
                              { name: "Churn", value: data.predicted_churn },
                              {
                                name: "Retained",
                                value: data.predicted_retained,
                              },
                            ]}
                            dataKey="value"
                            innerRadius="68%"
                            outerRadius="88%"
                            paddingAngle={4}
                            stroke="none"
                          >
                            <Cell fill="#7565ed" />
                            <Cell fill="#d9d5fa" />
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="donut-center">
                        <strong>{number(total)}</strong>
                        <span>predictions</span>
                      </div>
                    </div>
                    <div className="donut-key">
                      <span>
                        <i />
                        Predicted churn <b>{number(data.predicted_churn)}</b>
                      </span>
                      <span>
                        <i />
                        Predicted retained{" "}
                        <b>{number(data.predicted_retained)}</b>
                      </span>
                    </div>
                  </ChartCard>
                </div>
                <div className="dashboard-charts dashboard-charts-equal">
                  <ChartCard
                    title="Risk distribution"
                    subtitle={`${data.high_risk_percentage.toFixed(1)}% of assessments are high risk`}
                  >
                    <div className="chart-container short-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={risk}
                          margin={{ left: -25 }}
                          barSize={40}
                        >
                          <CartesianGrid
                            strokeDasharray="4 5"
                            vertical={false}
                            stroke="#edf0f5"
                          />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "#9297a7" }}
                          />
                          <YAxis
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#9297a7" }}
                          />
                          <Tooltip
                            cursor={{ fill: "#f7f7fc" }}
                            contentStyle={tooltipStyle}
                          />
                          <Bar
                            isAnimationActive={false}
                            dataKey="count"
                            name="Assessments"
                            radius={[5, 5, 0, 0]}
                          >
                            {risk.map((item) => (
                              <Cell key={item.name} fill={COLORS[item.name]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                  <ChartCard
                    title="Subscription analysis"
                    subtitle="Customer assessments by subscription type"
                  >
                    <div className="chart-container short-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.subscriptions}
                          margin={{ left: -25 }}
                          barSize={26}
                        >
                          <CartesianGrid
                            strokeDasharray="4 5"
                            vertical={false}
                            stroke="#edf0f5"
                          />
                          <XAxis
                            dataKey="subscription_type"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "#9297a7" }}
                          />
                          <YAxis
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#9297a7" }}
                          />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend
                            iconType="circle"
                            wrapperStyle={{ fontSize: 11 }}
                          />
                          <Bar
                            isAnimationActive={false}
                            dataKey="total"
                            name="All assessments"
                            fill="#ddd9fa"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            isAnimationActive={false}
                            dataKey="churn"
                            name="Predicted churn"
                            fill="#7565ed"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                </div>
              </>
            )}
          </>
        )
      )}
      <section className="card recent-card">
        <div className="card-heading">
          <div>
            <h3>Recent predictions</h3>
            <p>The latest signals from your workspace · all time</p>
          </div>
          <Link className="text-link" to="/app/history">
            View history <ArrowRight size={15} />
          </Link>
        </div>
        <ErrorNotice message={recent.error} onRetry={recent.refresh} />
        {recent.data?.results?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Prediction</th>
                  <th>Churn probability</th>
                  <th>Risk level</th>
                  <th>Analyzed</th>
                </tr>
              </thead>
              <tbody>
                {recent.data.results.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className="customer-link"
                        to={`/app/history?record=${item.id}`}
                      >
                        #{item.customer_id}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={`outcome ${item.prediction ? "outcome-churn" : ""}`}
                      >
                        {item.prediction ? "Likely to churn" : "Likely to stay"}
                      </span>
                    </td>
                    <td>
                      <div className="probability-cell">
                        <span>{percent(item.churn_probability)}</span>
                        <div>
                          <i
                            style={{
                              width: `${item.churn_probability * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <RiskBadge risk={item.risk_level} />
                    </td>
                    <td className="muted nowrap">{date(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="recent-empty">
            {recent.loading
              ? "Loading recent predictions…"
              : "No predictions yet. Your first assessment will appear here."}
          </div>
        )}
      </section>
      <div className="insight-note">
        <Info size={15} />
        Predictions estimate risk, not guaranteed future behavior. Use them
        alongside your knowledge of each customer.
      </div>
    </>
  );
}
