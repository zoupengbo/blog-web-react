import React from 'react';
import { Breadcrumb as AntdBreadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import { useNavigation } from '../../context/NavigationContext';
import './index.scss';

const Breadcrumb: React.FC = () => {
  const { breadcrumbs, currentPath } = useNavigation();

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <div className="page-breadcrumb-wrapper">
      <AntdBreadcrumb className="page-breadcrumb">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isClickable = item.path && !isLast;

          return (
            <AntdBreadcrumb.Item key={item.path || index}>
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
            </AntdBreadcrumb.Item>
          );
        })}
      </AntdBreadcrumb>
    </div>
  );
};

export default Breadcrumb;
