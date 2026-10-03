import { AccountsDashboard, type AccountsDashboardConfig } from "@/components/AccountsDashboard";
import { TeamSetupPanel } from "@/components/TeamSetupPanel";

const STUDENT_ACCOUNTS: AccountsDashboardConfig = {
  kind: "student",
  noun: "student",
  title: "Student Account Dashboard",
  description: "Manage student sign-ins for the upload portal: passwords, lock/unlock, and recent login activity.",
  usernamePlaceholder: "e.g. year10-team1",
  passwordPolicy: "Use at least 6 characters with at least one capital letter and one number.",
  deleteNote: "Existing uploads will remain in the system.",
  renameNote: "Their adverts move to the new name. If they're signed in, they'll need to sign in again with it.",
  protectSelf: false,
  sidePanel: (accounts) => <TeamSetupPanel accounts={accounts} />,
};

const StudentAccountsDashboard = () => <AccountsDashboard config={STUDENT_ACCOUNTS} />;

export default StudentAccountsDashboard;
