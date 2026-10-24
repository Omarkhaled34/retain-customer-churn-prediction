import { ShieldCheck, CalendarDays, UserRound, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PageHeader, date } from "../components/UI";

export default function Profile() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        eyebrow="YOUR ACCOUNT"
        title="Your corner of the workspace."
        description="Account details and the privacy of your customer intelligence."
      />
      <section className="card profile-card">
        <div className="profile-hero">
          <span className="avatar avatar-large">
            {(user.first_name || user.username).slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h2>{user.first_name || user.username}</h2>
            <p>Customer Churn Intelligence member</p>
          </div>
        </div>
        <dl className="profile-details">
          <div>
            <dt>
              <UserRound size={18} />
              Username
            </dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt>
              <Mail size={18} />
              Email address
            </dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays size={18} />
              Member since
            </dt>
            <dd>{date(user.date_joined)}</dd>
          </div>
          <div>
            <dt>
              <ShieldCheck size={18} />
              Workspace access
            </dt>
            <dd>Private · Your records only</dd>
          </div>
        </dl>
      </section>
      <div className="notice">
        <ShieldCheck size={20} />
        <p>
          Your session is managed securely by Django. Customer records,
          prediction history, batch exports, and analytics are scoped to your
          account.
        </p>
      </div>
    </>
  );
}
