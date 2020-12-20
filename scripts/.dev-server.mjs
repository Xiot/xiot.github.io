import {esbuildPlugin} from '@web/dev-server-esbuild';
import {importMapsPlugin} from '@web/dev-server-import-maps';

// https://dmnsgn.medium.com/in-2020-go-bundler-free-eb29c1f05fc9
// https://css-tricks.com/going-buildless/

export default {
  nodeResolve: false,
  port: 3001,
  http2: false,
  debug: true,
  watch: true,
  outdir: './dist',
  esbuildTarget: 'auto',
  plugins: [
    esbuildPlugin({target: 'auto', outdir: '/dist'}),
    // importMapsPlugin(),
    importMapsPlugin({
      inject: {
        importMap: {
          imports: {
            luxon: 'https://moment.github.io/luxon/es6/luxon.js',
            // 'chart.js': 'https://cdn.jsdelivr.net/npm/chart.js@2.9.4/dist/Chart.min.js'
          }
        }
      }
    })
  ],
  middleware: [
    (ctx, next) => {
      console.log('middleware', ctx.request.url);
      return next();
    }
  ]
}