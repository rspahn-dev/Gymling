import { useState, useEffect } from 'react';

// This is a placeholder for your actual creature data fetching logic
// You would replace this with your actual API calls or local storage access
const mockCreature = {
  name: 'Fuzzy',
  level: 5,
  stats: {
    str: 10,
    agi: 12,
    sta: 8,
    int: 15,
  },
};

export const useCreature = () => {
  const [creature, setCreature] = useState(mockCreature);

  // useEffect(() => {
  //   // Fetch creature data here
  // }, []);

  return { creature };
};
