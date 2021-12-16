#include <math.h>

double floor(double x) {
  if(x < 0)
      return (int)x - 1;
  else
      return (int)x;
}
