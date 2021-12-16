clang \
  --target=wasm32 \
  -O3 \
  -nostdlib \
  -Wl,--no-entry \
  -Wl,--export-all \
  -Wl,--import-memory\
  -Wl,-z,stack-size=$[512 * 1024 * 1024] \
  -Iinclude\
  -o ../public/imagine.bin \
  rfx/*.c imagine.c
