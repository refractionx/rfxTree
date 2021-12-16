#include <memory.h>

extern unsigned char __heap_base;

unsigned char* bump_pointer = &__heap_base;
void* malloc(unsigned long n) {
  unsigned char* r = bump_pointer;
  bump_pointer += n;
  return (void *)r;
}

void free(void* p) {
  bump_pointer = &__heap_base;
}
