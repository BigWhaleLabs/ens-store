# Stores

Diffrent stores used accross BWL projects.

## Development in conjunction with another project

1. Run `yarn link` in the root folder ([more about yarn link](https://classic.yarnpkg.com/en/docs/cli/link))
2. Run develop mode with `yarn start`
3. **In another project** import `roll-up-plugin-polyfill-node` and add it to plugins in rollupOptions in the build of your `vite.config.ts` as instructed [here](https://github.com/WalletConnect/web3modal#using-with-vite)
4. **In another project** run `yarn link @big-whale-labs/stores`
5. Nice! Your project will now use the local version of `@big-whale-labs/stores`

## Available Scripts

- `yarn build` — build the code
- `yarn release` — create a release and publish the package
