// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  // Redirect to Home component which contains the actual Pauvrathon homepage
  return (
    <div className="min-h-screen">
      {/* The Home component is loaded by default in App.tsx routing */}
      {/* This component serves as a fallback */}
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">Pauvrathon</h1>
          <p className="text-xl text-muted-foreground">Chargement de la plateforme...</p>
          <div className="mt-4">
            <div className="h-2 w-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
