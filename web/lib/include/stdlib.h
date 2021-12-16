#pragma once
double drand48(void);
void qsort(void *array, int nitems, int size, int (*cmp)(const void*,const void*));
void qsort_r(void *array, int nitems, int size, int (*cmp)(const void*, const void*,const void*), void* arg);
void qsort_s(void *array, int nitems, int size, int (*cmp)(const void*, const void*,const void*), void* arg);
void exit(int code);
#define size_t int
