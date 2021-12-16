#include <stdint.h>
#include <math.h>
#include <complex.h>
#include <matrix.h>
#include <fft.h>

void *memset(void *b, int c, unsigned long len)
{
  int           i;
  unsigned char *p = b;
  i = 0;
  while(len > 0)
    {
      *p = c;
      p++;
      len--;
    }
  return(b);
}


extern unsigned char __heap_base;

struct Pixel {
  uint8_t r;
  uint8_t g;
  uint8_t b;
  uint8_t a;
};

typedef struct Pixel Pixel;

struct Kernel_3x3 {
  float topLeft;    float topCenter;    float topRight;
  float centerleft; float center;       float centerRight;
  float bottomLeft; float bottomCenter; float bottomRight;
};

struct Kernel_5x5 {
  float a; float f;          float g;            float h;           float i;
  float b; float topLeft;    float topCenter;    float topRight;    float j;
  float c; float centerleft; float center;       float centerRight; float k;
  float d; float bottomLeft; float bottomCenter; float bottomRight; float l;
  float e; float m;          float n;            float o;           float p;
};
typedef struct Kernel_5x5 Kernel_5x5;
typedef struct Kernel_3x3 Kernel_3x3;

typedef struct Pixel Pixel;

struct Texture {
  unsigned int width;
  unsigned int height;
  Pixel* data;
};

int printf(const char * format, ...) {
  return 0;
}

int putchar ( int character ) {
  return 0;
}

int puts ( const char * str ) {
  return 0;
}

typedef struct Texture Texture;

struct vec2 {
  float x;
  float y;
};

typedef struct vec2 vec2;

struct vec4 {
  float r;
  float g;
  float b;
  float a;
};

typedef struct vec4 vec4;

static inline float rfx_fast_sqrt(float n) {
    if (n < 0.00001) {
      return 0;
    }
    n = 1.0f / n;
    long i;
    float x, y;

    x = n * 0.5f;
    y = n;
    i = *(long *)&y;
    i = 0x5f3759df - (i >> 1);
    y = *(float *)&i;
    y = y * (1.5f - (x * y * y));

    return y;
}

static inline double mod(double a, double b)
{
    double mod;
    if (a < 0)
        mod = -a;
    else
        mod =  a;
    if (b < 0)
        b = -b;

    while (mod >= b)
        mod = mod - b;

    if (a < 0)
        return -mod;

    return mod;
}

static inline vec4 multiply_vec4(vec4 vector, float x) {
  vec4 a;
  a.r = vector.r * x;
  a.g = vector.g * x;
  a.b = vector.b * x;
  a.a = vector.a * x;
  return a;
}

static inline Pixel multiply_pixel(Pixel pixel, float x) {
  Pixel a;
  a.r = pixel.r * x;
  a.g = pixel.g * x;
  a.b = pixel.b * x;
  a.a = pixel.a * x;
  return a;
}

static inline vec4 multiply_pixel_vec4(Pixel pixel, float x) {
  vec4 a;
  a.r = pixel.r * x;
  a.g = pixel.g * x;
  a.b = pixel.b * x;
  a.a = pixel.a * x;
  return a;
}

static inline vec4 sampleAt(Texture* input, int column, int row) {
  Pixel p = input->data[column + row * input->width];
  return multiply_pixel_vec4(p, 0.00392156862f);
}

static inline vec4 sample(Texture* input, vec2 xy) {
  int x = xy.x * input->width;
  int y = xy.y * input->height;
  return sampleAt(input, x, y);
}

static inline vec4 sum_vec4(vec4* vectors, int len) {
  vec4 result;
  result.r = 0.0f;
  result.g = 0.0f;
  result.b = 0.0f;
  result.a = 0.0f;

  for (int i = 0; i < len; i++) {
    result.r += vectors[i].r;
    result.g += vectors[i].g;
    result.b += vectors[i].b;
    result.a += vectors[i].a;
  }
  return result;
}

static inline vec4 kernel_3x3_sample(Texture* input, vec2 xy, float* kernel) {
  int column = xy.x * input->width;
  int row = xy.y * input->height;

  vec4 samples[9];

  samples[0] = multiply_vec4(sampleAt(input, column - 1, row - 1), kernel[0]);
  samples[1] = multiply_vec4(sampleAt(input, column, row - 1), kernel[1]);
  samples[2] = multiply_vec4(sampleAt(input, column + 1, row - 1), kernel[2]);

  samples[3] = multiply_vec4(sampleAt(input, column - 1, row), kernel[3]);
  samples[4] = multiply_vec4(sampleAt(input, column, row), kernel[4]);
  samples[5] = multiply_vec4(sampleAt(input, column + 1, row), kernel[5]);

  samples[6] = multiply_vec4(sampleAt(input, column - 1, row + 1), kernel[6]);
  samples[7] = multiply_vec4(sampleAt(input, column, row + 1), kernel[7]);
  samples[8] = multiply_vec4(sampleAt(input, column + 1, row + 1), kernel[8]);

  return sum_vec4(samples, 9);
}


static inline vec4 kernel_5x5_sample(Texture* input, vec2 xy, float* kernel) {
  int column = xy.x * input->width;
  int row = xy.y * input->height;

  vec4 samples[25];

  samples[0] = multiply_vec4(sampleAt(input, column - 2, row - 2), kernel[0]);
  samples[1] = multiply_vec4(sampleAt(input, column - 1, row - 2), kernel[1]);
  samples[2] = multiply_vec4(sampleAt(input, column, row - 2), kernel[2]);
  samples[3] = multiply_vec4(sampleAt(input, column +1, row -2), kernel[3]);
  samples[4] = multiply_vec4(sampleAt(input, column +2, row -2), kernel[4]);

  samples[5] = multiply_vec4(sampleAt(input, column - 2, row - 1), kernel[5]);
  samples[6] = multiply_vec4(sampleAt(input, column - 1, row - 1), kernel[6]);
  samples[7] = multiply_vec4(sampleAt(input, column, row - 1), kernel[7]);
  samples[8] = multiply_vec4(sampleAt(input, column +1, row -1), kernel[8]);
  samples[9] = multiply_vec4(sampleAt(input, column +2, row -1), kernel[9]);

  samples[10] = multiply_vec4(sampleAt(input, column - 2, row), kernel[10]);
  samples[11] = multiply_vec4(sampleAt(input, column - 1, row), kernel[11]);
  samples[12] = multiply_vec4(sampleAt(input, column, row), kernel[12]);
  samples[13] = multiply_vec4(sampleAt(input, column +1, row), kernel[13]);
  samples[14] = multiply_vec4(sampleAt(input, column +2, row), kernel[14]);

  samples[15] = multiply_vec4(sampleAt(input, column - 2, row + 1), kernel[15]);
  samples[16] = multiply_vec4(sampleAt(input, column - 1, row + 1), kernel[16]);
  samples[17] = multiply_vec4(sampleAt(input, column, row +1), kernel[17]);
  samples[18] = multiply_vec4(sampleAt(input, column +1, row +1), kernel[18]);
  samples[19] = multiply_vec4(sampleAt(input, column +2, row+1), kernel[19]);

  samples[20] = multiply_vec4(sampleAt(input, column - 2, row + 2), kernel[20]);
  samples[21] = multiply_vec4(sampleAt(input, column - 1, row + 2), kernel[21]);
  samples[22] = multiply_vec4(sampleAt(input, column, row +2), kernel[22]);
  samples[23] = multiply_vec4(sampleAt(input, column +1, row +2), kernel[23]);
  samples[24] = multiply_vec4(sampleAt(input, column +2, row+2), kernel[24]);

  return sum_vec4(samples, 25);
}



static inline float dot4(vec4* a, vec4* b) {
  return (a->r * b->r) + (a->g * b->g) + (a->b * b->b) + (a->a * b->a);
}

static inline vec2 mod2(vec2 xy, float modulant) {
  vec2 result;
  result.x = mod(xy.x, modulant);
  result.y = mod(xy.y, modulant);
  return result;
}

static inline vec4 mod4(vec4 color, float modulant) {
  vec4 result;
  result.r = mod(color.r, modulant);
  result.g = mod(color.g, modulant);
  result.b = mod(color.b, modulant);
  result.a = mod(color.a, modulant);
  return result;
}

static inline vec4 mix(vec4 v1, vec4 v2, float a)
{
    vec4 result;
    // result.r = v1.r * v1.r * (1.0f - a) + v2.r * v2.r * a;
    // result.g = v1.g * v1.g  * (1.0f - a) + v2.g * v2.g * a;
    // result.b = v1.b * v1.b  * (1.0f - a) + v2.b * v2.b * a;
    // result.a = v1.a * v1.a  * (1.0f - a) + v2.a * v2.a * a;
    result.r = v1.r * (1.0f - a) + v2.r * a;
    result.g = v1.g * (1.0f - a) + v2.g * a;
    result.b = v1.b * (1.0f - a) + v2.b * a;
    result.a = v1.a * (1.0f - a) + v2.a * a;

    //
    // result.r = rfx_fast_sqrt(result.r);
    // result.g = rfx_fast_sqrt(result.g);
    // result.b = rfx_fast_sqrt(result.b);
    // result.a = rfx_fast_sqrt(result.a);

    return result;
}

vec4* previousFrame = 0;

float minX = 2147483647.0f;
float maxX = -2147483648.0f;
float minY = 2147483647.0f;
float maxY = -2147483648.0f;
float value = 0.9f;

float getMinX() {
  return minX;
}

float getMinY() {
  return minY;
}

float getMaxX() {
  return maxX;
}

float getMaxY() {
  return maxY;
}
// Pixel* maskFrame = 0;

vec4 stepSample(Texture* tex, vec2 xy, float steps) {
  vec2 img;
  img.x = xy.x * steps;
  img.y = xy.y * steps;
  return sample(tex, mod2(img, 1.));
}

vec4 grayscale(Texture* tex, vec2 xy, float uU) {
  vec4 color = sample(tex, xy);
  float luminance = 0.299f * color.r +  0.587f * color.g + 0.114f * color.b;
  color.r = uU * luminance;
  color.g = uU * luminance;
  color.b = uU * luminance;
  return color;
}

vec4 negative(Texture* tex, vec2 xy) {
  vec4 color = sample(tex, xy);
  color.r = 1.0f - color.r;
  color.g = 1.0f - color.g;
  color.b = 1.0f - color.b;
  return color;
}

vec4 maxRegion(Texture* tex, vec2 xy) {
  vec4 color = sample(tex, xy);
  if (((color.r + color.g + color.b)/3.0f) >= value) {
    if (minX > xy.x) {
      minX = xy.x;
    }

    if (minY > xy.y) {
      minY = xy.y;
    }


    if (maxX < xy.x) {
      maxX = xy.x;
    }

    if (maxY < xy.y) {
      maxY = xy.y;
    }

    color.r = 1.0f;
    color.g = 0.0f;
    color.b = 0.0f;
  }

  return color;
}


vec4 applyMask(vec4 color, vec4 maskColor, int maskOp) {
  if (maskOp == 1) {
    color.r = maskColor.r * color.r;
    color.g = maskColor.g * color.g;
    color.b = maskColor.b * color.b;
    color.a = maskColor.a * color.a;
  }

  return color;
}

float length2(vec2 xy) {
  return rfx_fast_sqrt((xy.x * xy.x) + (xy.y * xy.y));
}

vec4 fisheye(Texture* tex, vec2 xy) {
  float aperture = 190.0;
  float apertureHalf = 0.5 * aperture * (M_PI/180.);
  float maxFactor = rfx_sin(apertureHalf);
  vec2 uv;
  vec2 vw;
  vw.x = (2.0 * xy.x) - 1.0;
  vw.y = (2.0 * xy.y) - 1.0;
  float d = length2(xy);
  if (d < (2.0-maxFactor))
  {
    float maxFactorX = xy.x * maxFactor;
    float maxFactorY = xy.y * maxFactor;
    d = rfx_fast_sqrt((maxFactorX * maxFactorX) + (maxFactorY * maxFactorY));
    float z = rfx_fast_sqrt(1.0 - (d * d));
    float r = atan2(d, z) / M_PI;
    float phi = atan2(xy.y, xy.x);
    uv.x = r * rfx_cos(phi) + 0.5;
    uv.y = r * rfx_sin(phi) + 0.5;
  } else {
    uv.x = xy.x;
    uv.y = xy.y;
  }

  return sample(tex, uv);
}

vec4 zoom(Texture* tex, vec2 xy, float uX, float uY, float uU) {
  vec2 uv;
  uv.x = (xy.x * uU);
  uv.y = (xy.y * uU);

  return sample(tex, uv);
}

vec4 scanline(Texture* tex, vec2 xy, float uU, float uV) {
  float frequency = 150.0;
  float globalPosition = xy.x * frequency * uV;
  int intpart = (int)globalPosition;
  float decpart = globalPosition - intpart;
  float wavePosition = rfx_cos(decpart - uU);
  vec4 pel = sample(tex, xy);
  vec4 left;
  left.r = 0.0;
  left.g = 0.0;
  left.b = 0.0;
  left.a = 1.0;
  return mix(left, pel, wavePosition);
}

vec4 threshold(Texture* tex, vec2 xy, float uU) {
  vec4 bw = sample(tex, xy);
  float average = (bw.r + bw.g + bw.b) / 3.0;
  vec4 finalColor;
  if (average >= uU) {
    finalColor.r = 1.0;
    finalColor.g = 1.0;
    finalColor.b = 1.0;
    finalColor.a = 1.0;
  } else {
    finalColor.r = 0.0;
    finalColor.g = 0.0;
    finalColor.b = 0.0;
    finalColor.a = 1.0;
  }
  return finalColor;
}

vec4 motion(Texture* tex, vec2 xy, int offset) {
  vec4 color = sample(tex, xy);

  vec4 finalColor;
  finalColor.r = fabs((color.r) - previousFrame[offset].r);
  finalColor.g = fabs((color.g) - previousFrame[offset].g);
  finalColor.b = fabs((color.b) - previousFrame[offset].b);
  finalColor.a = 1.0;

  previousFrame[offset].r = color.r;
  previousFrame[offset].g = color.g;
  previousFrame[offset].b = color.b;

  return finalColor;
}

vec4 warhol(Texture* tex, vec2 xy, float uU) {
  float steps = 2.0;
  vec4 pel = stepSample(tex, xy, steps);
  vec4 tint;
  int offset = ((int)(xy.x * steps) + ((int)(xy.y * steps)) * 2);


  switch (offset) {
    case 0:
      tint.r = 1.0;
      tint.g = 1.0;
      tint.b = 0.0;
      tint.a = 0.0;
      break;
    case 1:
      tint.r = 0.0;
      tint.g = 0.0;
      tint.b = 1.0;
      tint.a = 0.0;
      break;
    case 2:
      tint.r = 1.0;
      tint.g = 0.0;
      tint.b = 1.0;
      tint.a = 0.0;
      break;
    default:
      tint.r = 0.0;
      tint.g = 1.0;
      tint.b = 1.0;
      tint.a = 0.0;
  }

  vec4 grayCoeff;
  grayCoeff.r = 0.3;
  grayCoeff.g = 0.59;
  grayCoeff.b = 0.11;

  float luminance = 0.299f * pel.r +  0.587f * pel.g + 0.114f * pel.b;
  return mix(pel, tint, luminance * uU);
}

vec4 temporal(Texture* tex, vec2 xy, int offset, float uU) {
  vec4 color = sample(tex, xy);
  vec4 tempColor;
  vec4 finalColor;
  tempColor.r = (color.r - previousFrame[offset].r) * uU;
  tempColor.g = (color.g - previousFrame[offset].g) * uU;
  tempColor.b = (color.b - previousFrame[offset].b) * uU;

  finalColor.r = tempColor.r + previousFrame[offset].r;
  finalColor.g = tempColor.g + previousFrame[offset].g;
  finalColor.b = tempColor.b + previousFrame[offset].b;
  finalColor.a = 1.0;

  previousFrame[offset].r = finalColor.r;
  previousFrame[offset].g = finalColor.g;
  previousFrame[offset].b = finalColor.b;

  return finalColor;
}
float distance4(vec4 a, vec4 b) {
  return rfx_sqrt(((a.r - b.r) * (a.r - b.r)) + ((a.g - b.g) * (a.g - b.g)) + ((a.b - b.b) * (a.b - b.b)));
}

vec4 removeBackground(Texture* tex, vec2 xy, int offset, int background, float uU) {
  vec4 color = sample(tex, xy);
  vec4 tempColor;
  vec4 finalColor;
  if (background) {
    return color;
  }
  tempColor.r = color.r - previousFrame[offset].r;
  tempColor.g = color.g - previousFrame[offset].g;
  tempColor.b = color.b - previousFrame[offset].b;

  float distance = distance4(previousFrame[offset], color);
  if (distance < uU) {
    finalColor.r = 0.0f;
    finalColor.g = 0.0f;
    finalColor.b = 0.0f;
    finalColor.a = 1.0;
  } else {
    finalColor.r = color.r;
    finalColor.g = color.g;
    finalColor.b = color.b;
    finalColor.a = 1.0;
  }
  return finalColor;
}

vec4 pixelize(Texture* tex, vec2 xy, int width, int height, float uU) {
  vec2 uv = xy;
  float rt_w = width;
  float rt_h = height;
  float pixel_w = uU == 0 ? 1 : width * uU;
  float pixel_h = uU == 0 ? 1 : height * uU;


  float dx = pixel_w*(1./rt_w);
  float dy = pixel_h*(1./rt_h);
  vec2 coord;
  coord.x = dx* (int)(uv.x/dx);
  coord.y = dy* (int)(uv.y/dy);

  return sample(tex, coord);
}

unsigned char* bump_pointer = &__heap_base;
void* malloc(unsigned long n) {
  unsigned char* r = bump_pointer;
  bump_pointer += n;
  return (void *)r;
}

int process(Pixel* input, unsigned int width, unsigned int height, Pixel* mask, Pixel* output, int background, int maskOp, int effect, int clear, float uX, float uY, float uU, float uV, float uZ) {
  unsigned int len = width * height;

  if (previousFrame == 0) {
    previousFrame = (vec4 *)malloc(sizeof(vec4) * width * height);
    memset(previousFrame, 0, sizeof(vec4) * width * height);
  }

  if (clear) {
    memset(previousFrame, 0, sizeof(vec4) * width * height);
    minX = 2147483647.0f;
    maxX = -2147483648.0f;
    minY = 2147483647.0f;
    maxY = -2147483648.0f;
    value = 0.9f;
  }

  Texture tex;
  tex.data = input;
  tex.width = width;
  tex.height = height;

  Texture maskTex;
  maskTex.data = mask;
  maskTex.width = width;
  maskTex.height = height;

  for(unsigned int i = 0; i < len; i++) {

    int x = i % width;
    int y = ((i - x) / width);

    vec2 xy;
    xy.x = (float)x / (width);
    xy.y = (float)y / (height);

    vec4 color;
    color = sample(&tex, xy);

    vec4 maskColor;
    maskColor = sample(&maskTex, xy);

    vec4 finalColor;

    Kernel_3x3 identityKernel = {
      0.0, 0.0, 0.0,
      0.0, 1.0, 0.0,
      0.0, 0.0, 0.0,
    };

    Kernel_3x3 edgeKernel1 = {
      1.0, 0.0, -1.0,
      0.0, 0.0, 0.0,
      -1.0, 0.0, 1.0,
    };

    Kernel_3x3 edgeKernel2 = {
      0.0, 1.0, 0.0,
      1.0, -4.0, 1.0,
      0.0, 1.0, 0.0,
    };

    Kernel_3x3 edgeKernel3 = {
      -1.0, -1.0, -1.0,
      -1.0, 8.0, -1.0,
      -1.0, -1.0, -1.0,
    };

    Kernel_3x3 sharpenKernel = {
      0.0, -1.0, 0.0,
      -1.0, 5.0, -1.0,
      0.0, -1.0, 0.0,
    };

    Kernel_3x3 boxBlurKernel = {
      1.0, 1.0, 1.0,
      1.0, 1.0, 1.0,
      1.0, 1.0, 1.0,
    };

    Kernel_5x5 boxBlurKernel5x5 = {
      1.0, 1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0,
    };

    Kernel_3x3 gaussianBlurKernel = {
      1.0, 2.0, 1.0,
      2.0, 4.0, 2.0,
      1.0, 2.0, 1.0,
    };

    Kernel_3x3 embossKernel = {
      0.0, 0.0, 1.0,
      0.0, 0.0, 0.0,
      -1.0, 0.0, 0.0,
    };

    Kernel_3x3 erosionKernel = {
      1.0, 1.0, 1.0,
      1.0, 1.0, 1.0,
      1.0, 1.0, 1.0,
    };

    Kernel_3x3 dilationKernel = {
      1.0, 1.0, 1.0,
      1.0, 0.0, 1.0,
      1.0, 1.0, 1.0,
    };

    vec4 color1;
    vec4 color2;
    vec4 color3;

    switch (effect) {
      case 0:
        finalColor = stepSample(&tex, xy, uU * 100);
        break;
      case 1:
        finalColor = grayscale(&tex, xy, uU);
        break;
      case 2:
        finalColor = warhol(&tex, xy, uU);
        break;
      case 3:
        finalColor = motion(&tex, xy, i);
        break;
      case 4:
        finalColor = temporal(&tex, xy, i, uU);
        break;
      case 5:
        finalColor = removeBackground(&tex, xy, i, background, uU);
        break;
      case 6:
        finalColor = threshold(&tex, xy, uU);
        break;
      case 7:
        finalColor = negative(&tex, xy);
        break;
      case 8:
        finalColor = fisheye(&tex, xy);
        break;
      case 9:
        finalColor = zoom(&tex, xy, uX, uY, uU);
        break;
      case 10:
        finalColor = scanline(&tex, xy, uU, uV);
        break;
      case 11:
        finalColor = pixelize(&tex, xy, width, height, uU);
        break;
      case 12:
        finalColor = kernel_3x3_sample(&tex, xy, (float *)&identityKernel);
        break;
      case 13:
        finalColor = kernel_3x3_sample(&tex, xy, (float *)&edgeKernel1);
        break;
      case 14:
        finalColor = kernel_3x3_sample(&tex, xy, (float *)&edgeKernel2);
        break;
      case 15:
        finalColor = kernel_3x3_sample(&tex, xy, (float *)&edgeKernel3);
        break;
      case 16:
        finalColor = kernel_3x3_sample(&tex, xy, (float *)&sharpenKernel);
        break;
      case 17:
        finalColor = multiply_vec4(kernel_3x3_sample(&tex, xy, (float *)&boxBlurKernel), 0.111111111);
        break;
      case 18:
        finalColor = multiply_vec4(kernel_3x3_sample(&tex, xy, (float *)&gaussianBlurKernel), 0.0625);
        break;
      case 19:
        finalColor = kernel_3x3_sample(&tex, xy, (float *)&embossKernel);
        break;
      case 20:

        color1.r = 1.0f;
        color1.g = 0.0f;
        color1.b = 0.0f;
        color1.a = 1.0f;

        color2.r = 0.0f;
        color2.g = 0.0f;
        color2.b = 1.0f;
        color2.a = 1.0f;

        finalColor = mix(color1, color2, (xy.x + uU)/2.0f);
        break;
      case 21:

        color1.r = 1.0f;
        color1.g = 0.0f;
        color1.b = 0.0f;
        color1.a = 1.0f;

        color2.r = 0.0f;
        color2.g = 0.0f;
        color2.b = 1.0f;
        color2.a = 1.0f;

        color3.r = 0.0f;
        color3.g = 1.0f;
        color3.b = 0.0f;
        color3.a = 1.0f;

        finalColor = mix(color1, color2, (xy.x + uU)/2.0f);
        finalColor = mix(finalColor, color3, (xy.y)/2.0f);
        break;
      case 22:
        finalColor = multiply_vec4(kernel_5x5_sample(&tex, xy, (float *)&boxBlurKernel5x5), 0.04);
        break;
      case 23:
        finalColor = maxRegion(&tex, xy);
        break;
      default:
        finalColor.r = color.r;
        finalColor.g = color.g;
        finalColor.b = color.b;
        finalColor.a = color.a;
        break;
    }


    finalColor = applyMask(finalColor, maskColor, maskOp);

    output[i].r = 255 * finalColor.r;
    output[i].g = 255 * finalColor.g;
    output[i].b = 255 * finalColor.b;
    output[i].a = 255;


    if (background == 1) {
      previousFrame[i].r = finalColor.r;
      previousFrame[i].g = finalColor.g;
      previousFrame[i].b = finalColor.b;
    }

    if (background > 1) {
      previousFrame[i].r = (previousFrame[i].r + finalColor.r) * 0.5;
      previousFrame[i].g = (previousFrame[i].g + finalColor.g) * 0.5;
      previousFrame[i].b = (previousFrame[i].b + finalColor.b) * 0.5;
    }

  }



  return 0;
}
