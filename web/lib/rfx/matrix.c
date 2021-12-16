#include <matrix.h>

int matrix_multiply_2d(matrix_2d a, matrix_2d b, matrix_2d c) {
  for (int i = 0; i < a.rows; i++) {
    for (int j = 0; j < b.columns; j++) {
      c.samples[(b.columns * i) + j] = 0.0;
      for (int p = 0; p < a.columns; p++) {
        c.samples[(b.columns * i) + j] += a.samples[(a.columns * i) + p] * b.samples[(b.columns * p) + j];
      }
    }
  }
  return 0;
}

int complex_matrix_multiply_2d(complex_matrix_2d a, complex_matrix_2d b, complex_matrix_2d c) {
  for (int i = 0; i < a.rows; i++) {
    for (int j = 0; j < b.columns; j++) {
      c.samples[(b.columns * i) + j].real = 0.0;
      c.samples[(b.columns * i) + j].imag = 0.0;
      for (int p = 0; p < a.columns; p++) {
        c.samples[(b.columns * i) + j].real += a.samples[(a.columns * i) + p].real * b.samples[(b.columns * p) + j].real;
        c.samples[(b.columns * i) + j].imag += a.samples[(a.columns * i) + p].imag * b.samples[(b.columns * p) + j].imag;
      }
    }
  }
  return 0;
}

int complex_real_matrix_multiply_2d(complex_matrix_2d a, matrix_2d b, complex_matrix_2d c) {
  for (int i = 0; i < a.rows; i++) {
    for (int j = 0; j < b.columns; j++) {
      c.samples[(b.columns * i) + j].real = 0.0;
      c.samples[(b.columns * i) + j].imag = 0.0;
      for (int p = 0; p < a.columns; p++) {
        c.samples[(b.columns * i) + j].real += a.samples[(a.columns * i) + p].real * b.samples[(b.columns * p) + j];
        c.samples[(b.columns * i) + j].imag += a.samples[(a.columns * i) + p].imag * b.samples[(b.columns * p) + j];
      }
    }
  }
  return 0;
}
