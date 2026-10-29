const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");
const sharedPackage = path.resolve(
	monorepoRoot,
	"packages",
	"nfe-emissao-shared",
);

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot, sharedPackage];
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
	"@mais-gestao/nfe-emissao-shared": sharedPackage,
};

module.exports = config;
