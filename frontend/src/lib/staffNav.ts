export interface NavItem {
  to: string;
  label: string;
  /** Shown instead of `label` on narrower screens, where space in the banner is tight. */
  shortLabel?: string;
}

/** The staff app's sections, shown in the banner of every staff page. */
export const STAFF_NAV: NavItem[] = [
  { to: "/staff", label: "Advert Dashboard", shortLabel: "Adverts" },
  { to: "/staff/students", label: "Student accounts", shortLabel: "Students" },
  { to: "/staff/staff-accounts", label: "Staff accounts", shortLabel: "Staff" },
];
