import React from 'react';
import { Navigate } from 'react-router-dom';

interface PrivateRouteProps {
  element: JSX.Element;
  isAuthenticated: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ element, isAuthenticated }) => {
  return isAuthenticated ? element : <Navigate to="/login" />;
};

export default PrivateRoute;