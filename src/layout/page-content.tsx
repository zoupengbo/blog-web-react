import React from "react";
import { Route, Routes } from "react-router-dom";
import { useNavigation } from "../context/NavigationContext";
import Breadcrumb from "../components/Breadcrumb";
import "./page-content.scss";

const PageContent: React.FC = () => {
  const { routeMap } = useNavigation();

  return (
    <div className="page-content">
      <Breadcrumb />
      
      <div className="page-content-body">
        <Routes>
          {Array.from(routeMap.values()).map((route) => (
            <Route 
              key={route.path}
              path={route.path} 
              element={<route.component />}
            />
          ))}
        </Routes>
      </div>
    </div>
  );
};

export { PageContent };
