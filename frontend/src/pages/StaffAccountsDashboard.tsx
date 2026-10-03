import { AccountsDashboard, type AccountsDashboardConfig } from "@/components/AccountsDashboard";

const STAFF_ACCOUNTS: AccountsDashboardConfig = {
  kind: "staff",
  noun: "staff",
  title: "Staff Account Dashboard",
  description:
    "Manage the adults who can sign in to the staff app: add colleagues, reset passwords, and lock or remove accounts.",
  usernamePlaceholder: "e.g. j.smith",
  passwordPolicy: "Use at least 10 characters with at least one capital letter and one number.",
  deleteNote: "Things they approved or uploaded stay in the system.",
  renameNote: "Things they uploaded or approved move to the new name. They'll need to sign in again with it (including you, if it's your own account).",
  protectSelf: true,
};

const StaffAccountsDashboard = () => <AccountsDashboard config={STAFF_ACCOUNTS} />;

export default StaffAccountsDashboard;
