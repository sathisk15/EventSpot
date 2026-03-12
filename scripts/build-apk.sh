#!/bin/sh

set -eu

variant="${1:-release}"

case "$variant" in
  debug)
    gradle_task="assembleDebug"
    apk_dir="debug"
    apk_name="app-debug.apk"
    node_env="development"
    ;;
  release)
    gradle_task="assembleRelease"
    apk_dir="release"
    apk_name="app-release.apk"
    node_env="production"
    ;;
  *)
    echo "Usage: sh ./scripts/build-apk.sh [debug|release]" >&2
    exit 1
    ;;
esac

project_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
output_dir="$project_root/builds/apk"
source_apk="$project_root/android/app/build/outputs/apk/$apk_dir/$apk_name"
target_apk="$output_dir/$apk_name"

mkdir -p "$output_dir"

(
  cd "$project_root/android"
  export NODE_ENV="$node_env"
  ./gradlew "$gradle_task"
)

if [ ! -f "$source_apk" ]; then
  echo "Expected APK not found at $source_apk" >&2
  exit 1
fi

cp -f "$source_apk" "$target_apk"
echo "APK copied to $target_apk"
