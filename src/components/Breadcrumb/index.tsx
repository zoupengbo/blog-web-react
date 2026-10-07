import React from 'react';
import { Breadcrumb as AntdBreadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import { useNavigation } from '../../context/NavigationContext';
import './index.scss';

const Breadcrumb: React.FC = () => {
  const { breadcrumbs, currentPath } = useNavigation();

  if (breadcrumbs.length === 0 || currentPath === '/ai-novel' || currentPath.startsWith('/ai-novel')) {
    return null;
  }

  const items = breadcrumbs.map((item, index) => {
    const isLast = index === breadcrumbs.length - 1;
    const isClickable = item.path && !isLast;

    return {
      key: item.path || String(index),
      title: (
        <div className="breadcrumb-item">
          {item.icon && (
            <span className="breadcrumb-icon">{item.icon}</span>
          )}
          {isClickable ? (
            <Link to={item.path} className="breadcrumb-link">
              {item.title}
            </Link>
          ) : (
            <span className={`breadcrumb-text ${isLast ? 'current' : ''}`}>
              {item.title}
            </span>
          )}
        </div>
      )
    };
  });

  return (
    <div className="page-breadcrumb-wrapper">
      <AntdBreadcrumb className="page-breadcrumb" items={items} />
    </div>
  );
};

export default Breadcrumb;
