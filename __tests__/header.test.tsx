import { render, screen, fireEvent } from "@testing-library/react";
import { TimeWindowFilter } from "@/components/layout/time-window-filter";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));

describe("TimeWindowFilter", () => {
  it("renders three pill buttons", () => {
    const onChange = jest.fn();
    render(<TimeWindowFilter value="30d" onChange={onChange} />);

    expect(screen.getByText("7D")).toBeInTheDocument();
    expect(screen.getByText("30D")).toBeInTheDocument();
    expect(screen.getByText("90D")).toBeInTheDocument();
  });

  it("highlights active value", () => {
    const onChange = jest.fn();
    render(<TimeWindowFilter value="30d" onChange={onChange} />);

    const active = screen.getByText("30D");
    expect(active).toHaveClass("bg-[#102A43]");
    expect(active).toHaveClass("text-white");

    const inactive = screen.getByText("7D");
    expect(inactive).toHaveClass("bg-[#EEF4FA]");
  });

  it("calls onChange on click", () => {
    const onChange = jest.fn();
    render(<TimeWindowFilter value="30d" onChange={onChange} />);

    fireEvent.click(screen.getByText("7D"));
    expect(onChange).toHaveBeenCalledWith("7d");
  });
});
