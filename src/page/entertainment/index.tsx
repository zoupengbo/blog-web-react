import React from 'react';
import { Routes, Route } from 'react-router-dom';

const Entertainment: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<div>娱乐模块首页</div>} />
    </Routes>
  );
};

export { Entertainment };
