import { render, screen } from "@testing-library/react";
import CityPulsePage from "@/app/page";

describe("CityPulsePage", () => {
  it("renders the page heading", () => {
    render(<CityPulsePage />);
    expect(
      screen.getByRole("heading", { name: /denver urban pulse/i })
    ).toBeInTheDocument();
  });
});
