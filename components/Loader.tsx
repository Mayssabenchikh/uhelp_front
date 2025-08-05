const Loader = () => {
  return (
    <>
     <div id="loader" className="flex justify-center items-center h-screen">
    <div
      className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  </div></>
  );
};

export default Loader;
