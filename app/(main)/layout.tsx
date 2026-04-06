import NavigationSidebar from '@/components/navigation/navigation_sidebar';

const MainLayout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-full">
      <div className="hidden md:flex! w-18 h-full z-30 flex-col fixed inset-y-0">
        <NavigationSidebar />
      </div>
      <main className="md:pl-18 h-full">{children}</main>
    </div>
  );
};

export default MainLayout;
