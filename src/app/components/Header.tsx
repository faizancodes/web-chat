import Logo from "../../../public/logo.png";
import Image from "next/image";
export default function Header() {
  return (
    <div className="w-full bg-gradient-to-r from-[#2a2b38] via-[#343541] to-[#2a2b38] border-b border-gray-600 p-4 shadow-lg">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center transform hover:rotate-12 transition-transform duration-300">
            <Image src={Logo} alt="Logo" width={100} height={100} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide hover:text-blue-400 transition-colors duration-300">
              WebChat
            </h1>
            <p className="text-sm text-gray-400">
              Made with ❤️ by{"  "}
              <a
                href="https://www.linkedin.com/in/faizancodes/"
                className="text-blue-400 hover:text-blue-500 transition-colors duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Faizan
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
