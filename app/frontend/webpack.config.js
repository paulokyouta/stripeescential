const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const env = dotenv.config().parsed || {};
const envKeys = {
  // NODE_ENV é definido automaticamente pelo webpack via `mode` -> não redefinir
  // aqui (causava "Conflicting values for process.env.NODE_ENV").
  'process.env': JSON.stringify({}),
};
// Lê do ficheiro .env
Object.keys(env).forEach(k => {
  envKeys[`process.env.${k}`] = JSON.stringify(env[k]);
});
// Lê variáveis REACT_APP_ do sistema (Netlify, CI, etc.)
Object.keys(process.env).filter(k => k.startsWith('REACT_APP_')).forEach(k => {
  envKeys[`process.env.${k}`] = JSON.stringify(process.env[k]);
});

const DIST = path.resolve(__dirname, '../../dist');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    // Raiz do dist como output -> o index.html copiado (to: DIST) fica dentro
    // do output e o dev server serve-o em "/". Os ficheiros finais e os URLs
    // ficam iguais aos de antes (JS vai para static/js via filename).
    path: DIST,
    filename: 'static/js/bundle.js',
    chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
    publicPath: '/',
    clean: true,
  },
  devtool: false,
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: true,
          mangle: true,
          format: { comments: false },
        },
        extractComments: false,
      }),
    ],
    // Mantem o entry como bundle.js (referenciado no index.html estatico);
    // so divide chunks assincronos (React.lazy) -> carregados a pedido.
    splitChunks: { chunks: 'async' },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src/'),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new webpack.DefinePlugin(envKeys),
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, '../backend/index.html'), to: DIST },
        { from: path.resolve(__dirname, '../backend/static/css'), to: path.join(DIST, 'static/css') },
        { from: path.resolve(__dirname, '../backend/static/img'), to: path.join(DIST, 'static/img') },
        { from: path.resolve(__dirname, '../backend/static/fonts'), to: path.join(DIST, 'static/fonts') },
        { from: path.resolve(__dirname, '_redirects'), to: DIST },
        { from: path.resolve(__dirname, 'robots.txt'), to: DIST },
        { from: path.resolve(__dirname, 'sitemap.xml'), to: DIST },
      ],
    }),
  ],
  devServer: {
    port: 8002,
    host: '0.0.0.0',
    static: { directory: DIST },
    historyApiFallback: true,
    hot: true,
    allowedHosts: 'all',
    client: { overlay: { errors: true, warnings: false } },
    // Em dev, imagens carregadas (logo, etc.) ficam no backend (porta 5000).
    // Sem isto, /static/img/uploads/* dava 404 no dev-server (imagem partida).
    proxy: {
      // Aponta para o backend de produção (Vercel + Firebase) -> vê os dados
      // reais editados no Puck. Para usar o backend local (data.json), troca
      // o target para 'http://localhost:5000'.
      '/api': {
        target: 'https://essential-seven.vercel.app',
        changeOrigin: true,
        secure: true,
      },
      '/static/img/uploads': {
        target: 'https://essential-seven.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
};
