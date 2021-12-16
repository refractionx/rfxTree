#include "math.h"

double atan2(double y, double x) {
  double a = fmin(fabs(x), fabs(y)) / fmax(fabs(x), fabs(y));
  double s = a * a;
  double r = ((-0.0464964749 * s + 0.15931422) * s - 0.327622764) * s * a + a;
  if (fabs(y) > fabs(x)) {
    r = 1.57079637 - r;
  }
  if (x < 0) {
    r = 3.14159274 - r;
  }
  if (y < 0) {
    r = -r;
  }
  if (x == 0 && y == 0)
    return 0.0;

  return r;
}
