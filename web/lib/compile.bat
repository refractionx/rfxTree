clang ^
  --target=wasm32 ^
  -O2 ^
  -nostdlib ^
  -Wl,--no-entry ^
  -Wl,--export-all ^
  -Wl,--import-memory ^
  -Wl,-z,stack-size=536870912 ^
  -Iinclude ^
  -Irfx\include ^
  -o ..\public\imagine.bin ^
  rfx\*.c imagine.c
