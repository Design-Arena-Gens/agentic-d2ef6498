export const metadata = {
  title: "Video Generator - Ary Walking",
  description: "Generate a walking city video with Three.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b0e13", color: "#e6e9ef" }}>
        {children}
      </body>
    </html>
  );
}
