export default function NotFound() {
  return (
    <main className="grid min-h-screen place-content-center gap-3.5 bg-[#f5f5f7] p-6 text-center text-[#1d1d1f]">
      <p className="m-0 text-sm font-semibold text-[#0071e3]">404</p>
      <h1 className="m-0 text-[clamp(36px,6vw,72px)] leading-none tracking-normal">未找到战役</h1>
      <a className="text-[#5f6368] no-underline hover:text-[#1d1d1f]" href="/">
        返回战役沙盘库
      </a>
    </main>
  );
}
