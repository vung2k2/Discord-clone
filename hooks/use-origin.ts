const useOrigin = () => {
  const origin =
    typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';

  return origin;
};

export default useOrigin;
