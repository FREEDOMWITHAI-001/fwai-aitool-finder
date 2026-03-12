import { useState, useEffect } from 'react';

/**
 * Detects the number of CSS grid columns for a given grid class name.
 * Creates a hidden probe element with the same class to measure
 * the actual computed grid-template-columns from CSS media queries.
 */
export default function useGridColumns(gridClassName) {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const probe = document.createElement('div');
    probe.className = gridClassName;
    probe.style.visibility = 'hidden';
    probe.style.position = 'fixed';
    probe.style.top = '0';
    probe.style.left = '0';
    probe.style.right = '0';
    probe.style.pointerEvents = 'none';
    probe.style.zIndex = '-1';
    probe.style.height = '0';
    probe.style.overflow = 'hidden';
    document.body.appendChild(probe);

    const detect = () => {
      const computed = getComputedStyle(probe).gridTemplateColumns;
      const cols = computed.split(' ').filter(Boolean).length;
      if (cols > 0) setColumns(cols);
    };

    detect();
    window.addEventListener('resize', detect);

    return () => {
      window.removeEventListener('resize', detect);
      if (probe.parentNode) probe.parentNode.removeChild(probe);
    };
  }, [gridClassName]);

  return columns;
}
