#ifndef __MATRIX_H
#define __MATRIX_H

#include <complex.h>

struct matrix_2d {
  int rows;
  int columns;
  double* samples;
};

struct complex_matrix_2d {
  int rows;
  int columns;
  rfx_complex* samples;
};

typedef struct matrix_2d matrix_2d;
typedef struct complex_matrix_2d complex_matrix_2d;

int matrix_multiply_2d(matrix_2d a, matrix_2d b, matrix_2d c);
int complex_matrix_multiply_2d(complex_matrix_2d a, complex_matrix_2d b, complex_matrix_2d c);
int complex_real_matrix_multiply_2d(complex_matrix_2d a, matrix_2d b, complex_matrix_2d c);
#endif
