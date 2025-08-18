import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { NovelModule } from './novelModule';

const Entertainment: React.FC = () => {
  return (
    <Routes>
      <Route path="/novel" element={<NovelModule />} />
      <Route path="/" element={<NovelModule />} />
    </Routes>
  );
};

export { Entertainment };
