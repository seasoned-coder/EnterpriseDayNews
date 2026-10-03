import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoginSlip } from "@/components/LoginSlip";

const login = { username: "rocket-lemonade", password: "Tiger-Maple-47" };

describe("LoginSlip", () => {
  it("shows the team, password, Wi-Fi and app address with a QR code for each step", () => {
    render(
      <LoginSlip
        login={login}
        details={{ wifiName: "EnterpriseDay", wifiPassword: "Sunflower88", appAddress: null }}
        address="http://192.168.1.10"
      />,
    );

    expect(screen.getByText("rocket-lemonade")).toBeInTheDocument();
    expect(screen.getByText("Tiger-Maple-47")).toBeInTheDocument();
    expect(screen.getByText("1. Join the Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("Sunflower88")).toBeInTheDocument();
    expect(screen.getByText("2. Open the app")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.10/student")).toBeInTheDocument();
    expect(screen.getByTitle("Join the event Wi-Fi")).toBeInTheDocument();
    expect(screen.getByTitle("Open the student app")).toBeInTheDocument();
  });

  it("leaves out the Wi-Fi step when no Wi-Fi name is saved", () => {
    render(<LoginSlip login={login} address="http://192.168.1.10" />);

    expect(screen.queryByText(/Join the Wi-Fi/)).not.toBeInTheDocument();
    expect(screen.getByText("Open the app")).toBeInTheDocument();
  });
});
