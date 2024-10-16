#!/bin/bash

set -e -x

TMP_DIR=$(mktemp -d)
cd "$TMP_DIR" || exit

trap 'rm -rf "$TMP_DIR"' EXIT

echo $TMP_DIR

git clone --depth 1 https://github.com/backstage/community-plugins
cd community-plugins/workspaces/tech-insights || exit

yarn install
cd plugins || exit

mkdir -p plugins-root

echo -e "plugins:" > plugins-root/plugins.yaml

cd tech-insights || exit
npx @janus-idp/cli package export-dynamic-plugin
cd dist-dynamic || exit
npm pack  --json | tee pack.json
integrity=$(jq -r '.[0].integrity' pack.json)
filename=$(jq -r '.[0].filename' pack.json)
echo -e "  - package: http://plugin-registry:8080/$filename" >> ../../plugins-root/plugins.yaml
echo -e "    integrity: $integrity" >> ../../plugins-root/plugins.yaml
cp "$filename" ../../plugins-root
cp "$filename" ~/Code/rhdh-local/local-plugins
cd ../..

cd tech-insights-backend || exit
npx tsc
yarn build
npx @janus-idp/cli package export-dynamic-plugin
cd dist-dynamic || exit
npm pack  --json | tee pack.json
integrity=$(jq -r '.[0].integrity' pack.json)
filename=$(jq -r '.[0].filename' pack.json)
echo -e "  - package: http://plugin-registry:8080/$filename" >> ../../plugins-root/plugins.yaml
echo -e "    integrity: $integrity" >> ../../plugins-root/plugins.yaml
cp "$filename" ../../plugins-root
cp "$filename" ~/Code/rhdh-local/local-plugins
cd ../..

cd tech-insights-backend-module-jsonfc || exit
npx @janus-idp/cli package export-dynamic-plugin
cd dist-dynamic || exit
npm pack  --json | tee pack.json
integrity=$(jq -r '.[0].integrity' pack.json)
filename=$(jq -r '.[0].filename' pack.json)
echo -e "  - package: http://plugin-registry:8080/$filename" >> ../../plugins-root/plugins.yaml
echo -e "    integrity: $integrity" >> ../../plugins-root/plugins.yaml
cp "$filename" ../../plugins-root
cp "$filename" ~/Code/rhdh-local/local-plugins
cd ../..

cd plugins-root
ls -lha
cat plugins.yaml

oc new-build httpd --name=plugin-registry --binary
oc start-build plugin-registry --from-dir=. --wait
oc new-app --image-stream=plugin-registry

# oc delete buildconfig plugin-registry
# those needs to be delete after testing is done
#oc delete deployment plugin-registry
#oc delete service plugin-registry
#oc delete imagestream plugin-registry
