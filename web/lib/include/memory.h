#pragma once

#ifndef NULL
#define NULL (void *)0
#endif

void* malloc(unsigned long n);
void free(void* p);
void wipe();
