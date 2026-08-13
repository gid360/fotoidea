// Widget has its own layout without sidebar/auth
export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060f0a] via-[#0a261a] to-[#081a11]">
      {children}
    </div>
  );
}
