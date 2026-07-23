// vite.config.ts
import { defineConfig } from "file:///home/walzetass-kar/Documents/ProjectIhwal/LCC-Web-Design/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.41_terser@5.48.0/node_modules/vite/dist/node/index.js";
import react from "file:///home/walzetass-kar/Documents/ProjectIhwal/LCC-Web-Design/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21_@types+node@20.19.41_terser@5.48.0_/node_modules/@vitejs/plugin-react/dist/index.js";
import obfuscatorPlugin from "file:///home/walzetass-kar/Documents/ProjectIhwal/LCC-Web-Design/node_modules/.pnpm/vite-plugin-javascript-obfuscator@3.1.0/node_modules/vite-plugin-javascript-obfuscator/dist/index.cjs.js";
import path from "path";
var __vite_injected_original_dirname = "/home/walzetass-kar/Documents/ProjectIhwal/LCC-Web-Design";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    obfuscatorPlugin({
      apply: "build",
      exclude: [/node_modules/],
      options: {
        compact: true,
        identifierNamesGenerator: "hexadecimal",
        ignoreImports: true,
        stringArray: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.6,
        rotateStringArray: true,
        deadCodeInjection: false,
        controlFlowFlattening: false,
        selfDefending: false
      }
    })
  ],
  base: "./",
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src/renderer")
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return void 0;
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("@tanstack")) return "vendor-table";
          if (id.includes("jspdf") || id.includes("xlsx") || id.includes("exceljs")) return "vendor-export";
          if (id.includes("@capacitor")) return "vendor-capacitor";
          if (id.includes("i18next")) return "vendor-i18n";
          if (id.includes("react")) return "vendor-react";
          return void 0;
        }
      }
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    }
  },
  server: {
    port: 5173
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS93YWx6ZXRhc3Mta2FyL0RvY3VtZW50cy9Qcm9qZWN0SWh3YWwvTENDLVdlYi1EZXNpZ25cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3dhbHpldGFzcy1rYXIvRG9jdW1lbnRzL1Byb2plY3RJaHdhbC9MQ0MtV2ViLURlc2lnbi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS93YWx6ZXRhc3Mta2FyL0RvY3VtZW50cy9Qcm9qZWN0SWh3YWwvTENDLVdlYi1EZXNpZ24vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IG9iZnVzY2F0b3JQbHVnaW4gZnJvbSAndml0ZS1wbHVnaW4tamF2YXNjcmlwdC1vYmZ1c2NhdG9yJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgb2JmdXNjYXRvclBsdWdpbih7XG4gICAgICBhcHBseTogJ2J1aWxkJyxcbiAgICAgIGV4Y2x1ZGU6IFsvbm9kZV9tb2R1bGVzL10sXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGNvbXBhY3Q6IHRydWUsXG4gICAgICAgIGlkZW50aWZpZXJOYW1lc0dlbmVyYXRvcjogJ2hleGFkZWNpbWFsJyxcbiAgICAgICAgaWdub3JlSW1wb3J0czogdHJ1ZSxcbiAgICAgICAgc3RyaW5nQXJyYXk6IHRydWUsXG4gICAgICAgIHN0cmluZ0FycmF5RW5jb2Rpbmc6IFsnYmFzZTY0J10sXG4gICAgICAgIHN0cmluZ0FycmF5VGhyZXNob2xkOiAwLjYsXG4gICAgICAgIHJvdGF0ZVN0cmluZ0FycmF5OiB0cnVlLFxuICAgICAgICBkZWFkQ29kZUluamVjdGlvbjogZmFsc2UsXG4gICAgICAgIGNvbnRyb2xGbG93RmxhdHRlbmluZzogZmFsc2UsXG4gICAgICAgIHNlbGZEZWZlbmRpbmc6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9KSxcbiAgXSxcbiAgYmFzZTogJy4vJyxcbiAgdGVzdDoge1xuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgIHNldHVwRmlsZXM6IFsnLi90ZXN0cy9zZXR1cC50cyddLFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3JlbmRlcmVyJyksXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBlbXB0eU91dERpcjogdHJ1ZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzKGlkKSB7XG4gICAgICAgICAgaWYgKCFpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHJldHVybiB1bmRlZmluZWRcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2x1Y2lkZS1yZWFjdCcpKSByZXR1cm4gJ3ZlbmRvci1pY29ucydcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlY2hhcnRzJykpIHJldHVybiAndmVuZG9yLWNoYXJ0cydcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ0B0YW5zdGFjaycpKSByZXR1cm4gJ3ZlbmRvci10YWJsZSdcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2pzcGRmJykgfHwgaWQuaW5jbHVkZXMoJ3hsc3gnKSB8fCBpZC5pbmNsdWRlcygnZXhjZWxqcycpKSByZXR1cm4gJ3ZlbmRvci1leHBvcnQnXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdAY2FwYWNpdG9yJykpIHJldHVybiAndmVuZG9yLWNhcGFjaXRvcidcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ2kxOG5leHQnKSkgcmV0dXJuICd2ZW5kb3ItaTE4bidcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ3JlYWN0JykpIHJldHVybiAndmVuZG9yLXJlYWN0J1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBtaW5pZnk6ICd0ZXJzZXInLFxuICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZSxcbiAgICAgICAgcGFzc2VzOiAyLFxuICAgICAgfSxcbiAgICAgIG1hbmdsZToge1xuICAgICAgICBzYWZhcmkxMDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBmb3JtYXQ6IHtcbiAgICAgICAgY29tbWVudHM6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA1MTczLFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlYsU0FBUyxvQkFBb0I7QUFDMVgsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sc0JBQXNCO0FBQzdCLE9BQU8sVUFBVTtBQUhqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixpQkFBaUI7QUFBQSxNQUNmLE9BQU87QUFBQSxNQUNQLFNBQVMsQ0FBQyxjQUFjO0FBQUEsTUFDeEIsU0FBUztBQUFBLFFBQ1AsU0FBUztBQUFBLFFBQ1QsMEJBQTBCO0FBQUEsUUFDMUIsZUFBZTtBQUFBLFFBQ2YsYUFBYTtBQUFBLFFBQ2IscUJBQXFCLENBQUMsUUFBUTtBQUFBLFFBQzlCLHNCQUFzQjtBQUFBLFFBQ3RCLG1CQUFtQjtBQUFBLFFBQ25CLG1CQUFtQjtBQUFBLFFBQ25CLHVCQUF1QjtBQUFBLFFBQ3ZCLGVBQWU7QUFBQSxNQUNqQjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLE1BQU07QUFBQSxFQUNOLE1BQU07QUFBQSxJQUNKLGFBQWE7QUFBQSxJQUNiLFlBQVksQ0FBQyxrQkFBa0I7QUFBQSxFQUNqQztBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsZ0JBQWdCO0FBQUEsSUFDL0M7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUEsSUFDYixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixhQUFhLElBQUk7QUFDZixjQUFJLENBQUMsR0FBRyxTQUFTLGNBQWMsRUFBRyxRQUFPO0FBQ3pDLGNBQUksR0FBRyxTQUFTLGNBQWMsRUFBRyxRQUFPO0FBQ3hDLGNBQUksR0FBRyxTQUFTLFVBQVUsRUFBRyxRQUFPO0FBQ3BDLGNBQUksR0FBRyxTQUFTLFdBQVcsRUFBRyxRQUFPO0FBQ3JDLGNBQUksR0FBRyxTQUFTLE9BQU8sS0FBSyxHQUFHLFNBQVMsTUFBTSxLQUFLLEdBQUcsU0FBUyxTQUFTLEVBQUcsUUFBTztBQUNsRixjQUFJLEdBQUcsU0FBUyxZQUFZLEVBQUcsUUFBTztBQUN0QyxjQUFJLEdBQUcsU0FBUyxTQUFTLEVBQUcsUUFBTztBQUNuQyxjQUFJLEdBQUcsU0FBUyxPQUFPLEVBQUcsUUFBTztBQUNqQyxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsZUFBZTtBQUFBLFFBQ2YsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLFVBQVU7QUFBQSxNQUNaO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixVQUFVO0FBQUEsTUFDWjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
