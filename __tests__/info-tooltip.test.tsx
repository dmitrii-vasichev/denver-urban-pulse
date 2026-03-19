import { render, screen } from "@testing-library/react";
import { InfoTooltip } from "@/components/ui/info-tooltip";

describe("InfoTooltip", () => {
  it("renders the info button with accessible label", () => {
    render(<InfoTooltip text="Test explanation" />);
    expect(screen.getByRole("button", { name: "Show chart info" })).toBeInTheDocument();
  });

  it("contains the tooltip text in the DOM", () => {
    render(<InfoTooltip text="Test explanation" />);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Test explanation");
  });
});
