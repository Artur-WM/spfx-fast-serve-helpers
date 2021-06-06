import webpack from 'webpack';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const certificateManager = require('@rushstack/debug-certificate-manager');
const certificateStore = new certificateManager.CertificateStore();

import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { ClearCssModuleDefinitionsPlugin } from '../plugins/ClearCssModuleDefinitionsPlugin';
import { TypeScriptResourcesPlugin } from '../plugins/TypeScriptResourcesPlugin';
import { getJSONFile } from './helpers';
import { NodePackage } from '../common/types';

const packageJson = getJSONFile<NodePackage>('package.json');
const hasESLint = !!packageJson.devDependencies['@typescript-eslint/parser'];
const rootFolder = path.resolve(process.cwd());

export function createBaseConfig(isLibraryComponent: boolean): webpack.Configuration {
  const port = isLibraryComponent ? 4320 : 4321;
  const host = 'https://localhost:' + port;

  const cssLoader = require.resolve('css-loader');
  const themedLoader = require.resolve('@microsoft/loader-load-themed-styles');

  const baseConfig: webpack.Configuration = {
    target: 'web',
    mode: 'development',
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      modules: ['node_modules']
    },
    context: rootFolder,
    module: {
      rules: [
        {
          use: [
            {
              loader: require.resolve('ts-loader'),
              options: {
                transpileOnly: true,
                compilerOptions: {
                  declarationMap: false
                }
              },
            }
          ],
          test: /\.tsx?$/,
          exclude: /node_modules/
        },
        {
          use: [{
            loader: require.resolve('file-loader'),
            options: {
              name: '[name]_[hash].[ext]',
              esModule: false

            }
          }],
          test: /\.(jpe?g|png|woff|eot|ttf|svg|gif|dds)$/i
        },
        {
          use: [{
            loader: 'html-loader'
          }],
          test: /\.html$/
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: themedLoader,
              options: {
                async: true
              }
            },
            {
              loader: cssLoader,
              options: {
                esModule: false,
                modules: false
              }
            }
          ]
        },
        {
          test: function (fileName) {
            return fileName.endsWith('.module.scss');   // scss modules support
          },
          use: [
            {
              loader: themedLoader,
              options: {
                async: true
              }
            },
            require.resolve('spfx-css-modules-typescript-loader'),
            {
              loader: cssLoader,
              options: {
                esModule: false,
                modules: {
                  localIdentName: '[local]_[hash:base64:8]',
                  mode: (resourcePath: string) => {
                    if (resourcePath.endsWith('.css') && /node_modules/gi.test(resourcePath)) {
                      return 'global';
                    }
                    return 'local';
                  }
                }
              }
            },
            {
              loader: require.resolve('sass-loader'),
              options: {
                implementation: require('node-sass')
              }
            }
          ]
        },
        {
          test: function (fileName) {
            return !fileName.endsWith('.module.scss') && fileName.endsWith('.scss');  // just regular .scss
          },
          use: [
            {
              loader: themedLoader,
              options: {
                async: true
              }
            },
            {
              loader: cssLoader,
              options: {
                esModule: false,
                modules: false
              }
            },
            {
              loader: require.resolve('sass-loader'),
              options: {
                implementation: require('node-sass')
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new webpack.WatchIgnorePlugin([path.resolve(rootFolder, 'temp')]),
      new ForkTsCheckerWebpackPlugin({
        eslint: hasESLint ? {
          files: './src/**/*.{ts,tsx}',
          enabled: true
        } : undefined,
        async: true
      }),
      new TypeScriptResourcesPlugin(),
      new ClearCssModuleDefinitionsPlugin({
        deleted: false,
        rootFolder
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'DEBUG': JSON.stringify(true)
      })],
    devServer: {
      hot: false,
      contentBase: rootFolder,
      publicPath: host + '/dist/',
      host: 'localhost',
      port: port,
      disableHostCheck: true,
      historyApiFallback: true,
      writeToDisk: isLibraryComponent,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      https: {
        cert: certificateStore.certificateData,
        key: certificateStore.keyData
      }
    },
  }

  return baseConfig;
}