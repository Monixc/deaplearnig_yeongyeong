import React from "react";

interface GlobalMobileLayoutProps {
  children: React.ReactNode;
}

const GlobalMobileLayout: React.FC<GlobalMobileLayoutProps> = ({
  children,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen px-4">
      <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-lg shadow-lg p-8 w-full max-w-md">
        {children}
      </div>
    </div>
  );
};

export default GlobalMobileLayout;
