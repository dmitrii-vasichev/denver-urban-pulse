import { render, screen } from "@testing-library/react";
import { SidebarItem } from "@/components/layout/sidebar-item";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("SidebarItem", () => {
  it("renders active item with correct styling", () => {
    render(
      <SidebarItem
        href="/"
        label="City Pulse"
        icon={<span data-testid="icon">icon</span>}
        active={true}
      />
    );
    const link = screen.getByRole("link", { name: /city pulse/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass("bg-[#E9F2FF]");
    expect(link).toHaveClass("text-[#0B4F8C]");
  });

  it("renders inactive item without active styles", () => {
    render(
      <SidebarItem
        href="/environment"
        label="Environment"
        icon={<span>icon</span>}
        active={false}
      />
    );
    const link = screen.getByRole("link", { name: /environment/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass("text-[#243B53]");
    expect(link).not.toHaveClass("bg-[#E9F2FF]");
  });

  it("renders disabled item as non-clickable span", () => {
    render(
      <SidebarItem
        href="/services"
        label="Services"
        icon={<span>icon</span>}
        active={false}
        disabled={true}
      />
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByText("Soon")).toBeInTheDocument();
  });
});
