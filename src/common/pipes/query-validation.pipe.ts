import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class QueryValidationPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata): Promise<any> {
    // Only validate query parameters
    if (metadata.type !== 'query') {
      return value as any;
    }

    if (!metadata.data) {
      return value as any;
    }

    // Convert plain object to class instance
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const object = plainToInstance(metadata.metatype as any, value as any);

    // Validate the object
    const errors = await validate(object);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => {
          const constraints = Object.values(error.constraints || {});
          return `${error.property}: ${constraints.join(', ')}`;
        })
        .join('; ');

      throw new BadRequestException({
        message: 'Query parameter validation failed',
        errors: errorMessages,
        statusCode: 400,
      });
    }

    return object as any;
  }
}
